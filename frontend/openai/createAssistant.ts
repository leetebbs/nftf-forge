import OpenAi from "openai";
import { Assistant } from "openai/resources/beta/assistants";
import { tools } from "../tools/allTools";
// import { getWalletAddressTool } from "../tools/getWalletAddress";
import { assistantPrompt} from "../const/prompt";

export async function createAssistant(client: OpenAi): Promise<Assistant> {
    return await client.beta.assistants.create({ 
        model: "gpt-4o-mini",
        name: "ai-assistant",
        instructions: assistantPrompt,
        tools: Object.values(tools).map(tool => ({ type: 'function', ...tool.definition }))
     });
}