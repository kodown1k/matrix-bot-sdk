import {MatrixClient, MentionPill, MessageEvent, MessageEventContent, RichConsoleLogger} from "matrix-bot-sdk";
// import {ChatOpenAI} from "@langchain/openai";
import {ChatOpenAI} from "langchain/chat_models/openai";

import {markdown} from "../help/markdown";
import {Answer, Query} from "../db_model/query";
import {LogLevel, LogService} from "../help/LogService";

LogService.setLogger(new RichConsoleLogger());
LogService.setLevel(LogLevel.DEBUG);

export async function runRoomsCommand(roomId: string, event: MessageEvent<MessageEventContent>, textBody: string, client: MatrixClient) {

    const query = new Query(event, roomId, textBody)
    const history = await query.history();
    const queryRow = await query.save();

    let _model = 'gpt-3.5-turbo';
    if (textBody.includes('with:gpt-4 ')) {
        _model = 'gpt-4-turbo-preview';
        textBody = textBody.replace('with:gpt-4 ', '')
    }
    const model = new ChatOpenAI({temperature: 0.1, modelName: _model});

    let prompt = `

    Today is ${(new Date()).toLocaleDateString()}. Day of week is ${(new Date()).getDay()}.
    Current time is ${(new Date()).toLocaleTimeString()}. Localization is Stalowa Wola in Poland.
    
    As a Stefania, think quietly, with special attention on the New User Message. Use markdown for lists and tables.
    
    
    Context:
        """
        ${history}
        """
    
    Keeping in mind previous this context.
    Response in polish language as logically as you can for 
    ${query.getSender()} Message:
        """
        ${textBody}
        """
     
    `;

    // and as short as possible

    LogService.debug('room', prompt)
    // Stop by and say what you think about user message
    const res = await model.invoke(prompt);
    const answer = new Answer(queryRow.id, res.content.toString())
    await answer.save();
    const rendered = markdown.render(res.content.toString());

    LogService.debug(rendered)

    let text = `${res.content}`;
    let html = rendered;
    //
    // const sayHelloTo = event.sender;
    //
    //
    // if (sayHelloTo.startsWith("@")) {
    //     // Awesome! The user supplied an ID so we can create a proper mention instead
    //     const mention = await MentionPill.forUser(sayHelloTo, roomId, client);
    //     text = `${mention.text} ${roomsString}`;
    //     html = `${mention.html} ${roomsString}`;
    // }
    //
    //
    return client.sendMessage(roomId, {
        body: text,
        msgtype: "m.notice",
        format: "org.matrix.custom.html",
        formatted_body: html,
    });


    // The first argument is always going to be us, so get the second argument instead.


    // Now send that message as a notice

}
