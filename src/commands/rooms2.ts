import {MatrixClient, MentionPill, MessageEvent, MessageEventContent, RichConsoleLogger} from "matrix-bot-sdk";
// import {ChatOpenAI} from "@langchain/openai";
import {ChatOpenAI} from "langchain/chat_models/openai";
import {HumanMessage, SystemMessage, AIMessage} from "@langchain/core/messages";

import {markdown} from "../help/markdown";
import {Answer, Query} from "../db_model/query";
import {LogLevel, LogService} from "../help/LogService";
import {log} from "node:util";
import kfs from 'key-file-storage'
import {HumanChatMessage, SystemChatMessage} from "langchain/schema";

LogService.setLogger(new RichConsoleLogger());
LogService.setLevel(LogLevel.DEBUG);

const store = kfs('/home/perun/Code/matrix-bot-storage1', true)


export async function runRoomsCommand2(roomId: string, event: MessageEvent<MessageEventContent>, textBody: string, client: MatrixClient) {

    const query = new Query(event, roomId, textBody)
    const history = await query.history();
    const queryRow = await query.save();

    let _model = 'gpt-3.5-turbo';
//    let _model = 'gpt-4-turbo-preview';
    if (textBody.includes('with:gpt-4 ')) {
        _model = 'gpt-4-turbo-preview';
        textBody = textBody.replace('with:gpt-4 ', '')
    }
    const model = new ChatOpenAI({temperature: 1, modelName: _model});

    let system = new SystemMessage("You are helpfull assistant.");
    let prompt =
        [
            system,
  //          new SystemMessage(`**Conversation History:**`),
   //         ...history,


            new HumanMessage(textBody)
        ];

    // and as short as possible

    LogService.debug('room', prompt)
    // Stop by and say what you think about user message
    const res = await model.invoke(prompt);
    LogService.error('AI---------', res)
    const answer = new Answer(queryRow.id, res.content.toString())
    await answer.save();
    const rendered = markdown.render(res.content.toString());

    LogService.debug(rendered)

    let text = `${res.content}`;
    let html = rendered;

    const relatesId = event.content["m.relates_to"]?.event_id ?? event.eventId;

    return client.sendMessage(roomId, {
        body: text,
        msgtype: "m.notice",
        format: "org.matrix.custom.html",
        formatted_body: html,

        thread_id: relatesId,
        "m.relates_to": {
            type: "m.thread",
            rel_type: "m.thread",
            event_id: relatesId,
            "m.in_reply_to": {
                "event_id": relatesId
            },
            is_falling_back: true
        }
    });

}
