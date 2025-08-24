import OpenAI from "openai";
import { Run } from "openai/resources/beta/threads/runs/runs";
import { Thread } from "openai/resources/beta/threads/threads";
import { handleRunToolCalls } from "./handleRunToolCall";


export async function performRun(client: OpenAI, thread: Thread, run: Run) {
   console.log('Starting performRun with initial status:', run.status);
   
   // Track minting operations to prevent duplicates across the entire run
   let mintingCompleted = false;
   
   // Simple polling approach
   while (run.status !== "completed" && run.status !== "failed" && run.status !== "cancelled" && run.status !== "expired") {
     console.log('Current run status:', run.status);
     
     if (run.status === "requires_action") {
       console.log('Run requires action, handling tool calls...');
       
       // Check if this batch has minting calls
       const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls;
       const hasMintingCall = toolCalls?.some(call => call.function.name === 'uploadImageAndMetadataToIPFS');
       
       run = await handleRunToolCalls(client, thread, run, { mintingCompleted });
       
       // Mark minting as completed after the first successful minting call
       if (hasMintingCall && !mintingCompleted) {
         mintingCompleted = true;
         console.log('🎯 Minting operation completed - preventing further minting calls');
       }
     } else {
       // Wait and then refresh the run
       await new Promise(resolve => setTimeout(resolve, 1000));
       // Refresh the run status
       const refreshedRun = await client.beta.threads.runs.list(thread.id, { limit: 1 });
       if (refreshedRun.data.length > 0) {
         run = refreshedRun.data[0];
       }
     }
   }

   console.log('Final run status:', run.status);

   if(run.status === "failed") {
    const errorMessage = `I encountered an error : ${run.last_error?.message || "unknown error"} `;
    console.log("run failed: ", run.last_error);
    await client.beta.threads.messages.create(thread.id, { role: "assistant", content: errorMessage });
    return{
        type: "text",
        text: {
            value: errorMessage,
            annotations: []
        }
    }
   }

   if(run.status === "completed") {
     console.log('Run completed successfully, fetching messages...');
     const messages = await client.beta.threads.messages.list(thread.id);
     console.log('Found', messages.data.length, 'messages');
     
     const assistantMessage = messages.data.find(message => message.role === "assistant");
     console.log('Assistant message found:', !!assistantMessage);
     
     if (assistantMessage && assistantMessage.content.length > 0) {
       return assistantMessage.content[0];
     }
   }

   return {
    type: "text",
    text: {
        value: `No Response from assistant. Final status: ${run.status}`,
        annotations: []
    }
   }
}