
import ollama from 'ollama'


const system_prompt = `You are a music expert.
User will drop some information about a file, try to figure out, which song from wich band is meant. Some Songs are german Volksmusik titles.
You will get some information about the song, like copyright notice, track name, lyrics and so on.

respond in json format like this:
{
    "artist": "artist name",
    "title": "song title",
    "release": "27.7.1999",
    "album": "album name"
}

If you don't know the answer, say "". 
If you are not able to find an matching song return {}
`;

function lazyParseJson(text: string): any {
    // Entferne Zeilenumbrüche am Anfang/Ende
    let fixed = text.trim();

    // Ersetze einzelne Anführungszeichen nach Doppelpunkt durch doppelte Anführungszeichen
    fixed = fixed.replace(/:\s*'([^']*)'/g, (m, p1) => ': "' + p1.replace(/"/g, '\\"') + '"');

    // Ersetze nicht-escaped doppelte Anführungszeichen in Werten (z.B. bei Weird Al" Yankovic)
    fixed = fixed.replace(/:\s*"([^"]*?)"([^,\}\n]*)/g, (m, val, rest) => {
        // Wenn im Wert ein unescaped " vorkommt, ersetze es durch '
        const safeVal = val.replace(/"/g, "'");
        return ': "' + safeVal + '"' + rest;
    });

    // Ersetze numerische Schlüssel ohne Anführungszeichen durch Strings
    //fixed = fixed.replace(/(\s|{|,)(\d+)\s*:/g, (m, pre, num) => `${pre}"${num}":`);
    // Entferne numerische Schlüssel samt Wert (z.B. 00: "irgendwas",)
    fixed = fixed.replace(/(\s|{|,)\d+\s*:\s*("[^"]*"|'[^']*'|[^\s,}]+)\s*(,?)/g, (m, pre, val, comma) => pre.trim() === '{' ? pre : (comma ? pre : ''));

    // Ersetze einzelne Anführungszeichen in Schlüsseln (optional)
    fixed = fixed.replace(/'([^']+)':/g, '"$1":');

    // Entferne Komma vor schließender geschweifter Klammer (letztes Property)
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Versuche zu parsen
    try {
        return JSON.parse(fixed);
    } catch (e:any) {
        console.error("Kann nicht parsen:", e.message, "\nInput war:\n", fixed);
        return null;
    }
}


function extractJSON(text: string) {
    const matches = text.match(/{[\s\S]*?}/g);
    if (matches && matches.length > 0) {
        const last = matches[matches.length - 1];
        try {
            return JSON.parse(last.replace(/\\'/g, "'"));
        } catch (e:any) {
            console.log("Error parsing chat result:\n", text);
            console.error("Ungültiges JSON:", e.message);
            console.log("Versuche lazyParseJson");
            const lazyParsed = lazyParseJson(last);
            if (lazyParsed) {
                console.log("Lazy parsed JSON:", lazyParsed);
                return lazyParsed;
            }
            //console.error("Kann nicht parsen:", e, "\nInput war:\n", last);
            return null;
        }
    }
    return null;
}

//let MODEL = "llama3.1:8b";
let MODEL = "llama3.2:3b";
//let MODEL = "gemma3:1b";

class MusicLLM {

    private host: string;
    private port: number;
    private model: string;
    private messages: Array<{ role: string, content: string }>;

    /**
     * Constructor for the MusicLLM class.
     * @param {string} host - The host address of the LLM server.
     * @param {number} port - The port number of the LLM server.
     */
    constructor(host = "localhost", port = 11434) {
        this.host = host;
        this.port = port;
         // Assign model before usage
        this.model = MODEL;
        this.messages = [];
        try {
            (async () => {
                await ollama.pull({ model: MODEL });
                console.log("Model loaded");
            })();
        }
        catch (error) {
            console.error("Error loading model:", error);
        }
    }

    /**
     * Soft search for a song based on the provided message.
     * @param {string} message - The message containing the song information.
     * @returns {Promise<IMusicLLM_softsearch_result>} - The result of the soft search.
     */
    async soft_search(message: string): Promise<IMusicLLM_softsearch_result | null> {
        let chat_result: any = await ollama.chat({
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: system_prompt
                },
                {
                    role: "user",
                    content: message
                }
            ],
            stream: false,
            options: {
                temperature: 0.1
            }
        });
        try {
            if (chat_result?.message?.content) {
                let result: IMusicLLM_softsearch_result = extractJSON(chat_result?.message?.content);
                return result;
            }
            else {
                console.error("No content in chat result");
                return null;
            }
        }
        catch (error) {
            console.log("Error parsing chat result:\n", chat_result?.message?.content);
            console.error("Error parsing JSON:", error);
            return null;
        }
    }
}
//
let MusicLLMinstance = new MusicLLM();
export default MusicLLMinstance;

// (async () => {
//     const llm = new MusicLLM();
//     let chat_result = await llm.soft_search("DOLANNES");
//     console.log(chat_result);

// })();