import OpenAI from "openai";
import { Thread } from "openai/resources/beta/threads/threads";



export async function createThread(client: OpenAI, message: string): Promise<Thread> {
    console.log('Creating thread...');
    const thread = await client.beta.threads.create();
    console.log('Thread created with ID:', thread.id);

    if (!thread.id) {
        throw new Error('Failed to create thread: no ID returned');
    }

    await client.beta.threads.messages.create(thread.id, {
        role: "user",
        content: message
    });
    console.log('Message added to thread');

    return thread;
}