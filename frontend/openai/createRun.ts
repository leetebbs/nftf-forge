import OpenAI from "openai";
import { Run } from "openai/resources/beta/threads/runs/runs";
import { Thread } from "openai/resources/beta/threads/threads";

export async function createRun(client: OpenAI, thread: Thread, assistantId: string): Promise<Run> {
    console.log('Creating run for thread:', thread.id, 'with assistant:', assistantId);
    
    if (!thread.id) {
        throw new Error('Thread ID is undefined - cannot create run');
    }
    
    if (!assistantId) {
        throw new Error('Assistant ID is undefined - cannot create run');
    }

    const run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId
    });
    
    console.log('Run created with ID:', run.id, 'Status:', run.status);

    return run;
}