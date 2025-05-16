
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

function extractJSON(text: string) {
    const match = text.match(/{[\s\S]*}/);
    if (match) {
        try {
            return JSON.parse(match[0].replace(/\\'/g, "'"));
        } catch (e) {
            console.log("Error parsing chat result:\n", text);
            console.error("Ungültiges JSON:", e);
        }
    }
    return null;
}

let MODEL = "llama3.1:8b";

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