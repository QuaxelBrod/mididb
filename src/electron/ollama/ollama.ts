
import ollama from 'ollama'


const system_prompt = `You are a music expert.
User will drop some words, try to figure out, which song from wich band is meant.
respond in json format like this:
{
    "artist": "artist name",
    "title": "song title",
    "release": 27.7.1999,
    "album": "album name",
    "text": "full lyrics of the song"
}
If you don't know the answer, say "{}".
`;
//

export interface IMusicLLM_softsearch_result {
    artist?: string,
    title?: string,
    release?: string,
    album?: string,
    text?: string
}


export class MusicLLM {

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
        this.model = "llamusic/llamusic";
        this.messages = [];
        try {
            (async () => {
                await ollama.pull({ model: "llamusic/llamusic" });
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
    async soft_search(message: string): Promise<IMusicLLM_softsearch_result> {
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

        let result: IMusicLLM_softsearch_result = JSON.parse(chat_result);

        return chat_result;
    }
}
//


// (async () => {
//     const llm = new MusicLLM();
//     let chat_result = await llm.soft_search("DOLANNES");
//     console.log(chat_result);

// })();