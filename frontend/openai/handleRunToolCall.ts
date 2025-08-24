import OpenAI from "openai";
import { Run } from "openai/resources/beta/threads/runs/runs";
import { Thread } from "openai/resources/beta/threads/threads";
import { tools } from "../tools/allTools";

export async function handleRunToolCalls(client: OpenAI, thread: Thread, run: Run): Promise<Run> {
    const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls;
    if(!toolCalls) return run;
    const toolOutputs = await Promise.all(
        toolCalls.map(async (tool) => {
            const toolConfig = tools[tool.function.name];
            if(!toolConfig) {
                console.error(`Tool ${tool.function.name} not found`);
                return null;
            }

            try{
                const args = JSON.parse(tool.function.arguments);
                const output = await toolConfig.handler(args);
                return {
                    tool_call_id: tool.id,
                    output: JSON.stringify(output, (key, value) => {
                        // Handle BigInt serialization
                        if (typeof value === 'bigint') {
                            return value.toString();
                        }
                        return value;
                    })
                }
            } catch (error){
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    tool_call_id: tool.id,
                    output: `Error: ${errorMessage}`
                }
            }
        })
    )

    const validOutputs = toolOutputs.filter(Boolean) as OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[];

    if(validOutputs.length === 0) return run;

    return await client.beta.threads.runs.submitToolOutputs(
        run.id,
        {
            thread_id: thread.id,
            tool_outputs: validOutputs
        }
    )
}