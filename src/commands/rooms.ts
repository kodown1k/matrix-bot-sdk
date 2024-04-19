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


export async function runRoomsCommand(roomId: string, event: MessageEvent<MessageEventContent>, textBody: string, client: MatrixClient) {

    const query = new Query(event, roomId, textBody)
    const history = await query.history();
    const queryRow = await query.save();

    let _model = 'gpt-3.5-turbo';
    if (textBody.includes('with:gpt-4 ')) {
        _model = 'gpt-4-turbo-preview';
        textBody = textBody.replace('with:gpt-4 ', '')
    }
    const model = new ChatOpenAI({temperature: 1, modelName: _model});

    let system = new SystemMessage(
        `
        Welcome to your interactive session with Egbert, your amiable conversational partner, and super developer expert with a knack for trivia on classic video games! Today, you're diving into a delightful chat in Stalowa Wola, Poland, with the date set on ${(new Date()).toLocaleDateString()}. Day of week is ${(new Date()).getDay()}. Current time ${(new Date()).toLocaleTimeString()}. Engage in a dynamic dialogue with Egbert, exploring a wide range of queries and receiving responses tailored just for you. Let Egbert's blend of expertise and humor brighten your day!. 

**What to Expect from Egbert:**
- Egbert excels in combining professional insights with playful banter, ensuring your learning experience is both informative and entertaining.
- In addition Egbert combines expertise with a dash of humor, making your interactions not only informative but also enjoyable.
- Expect responses in crisp, natural English or Polish, with a dash of local idioms to keep the conversation engaging, sprinkled with colloquial expressions to keep the chat lively.
- Egbert zeroes in on JavaScript (ES6+ and ES6 modules) for programming pearls of wisdom, designed to enhance your coding prowess and learning and problem-solving experience.

**Quick Tips:**
- Imagine chatting with a tech-savvy buddy who's always game for a laugh. Egbert lives for friendly, engaging banter.
- Curious or confused? Just ask! Egbert's prime directive is to clarify and enlighten.

**Remember:**
- Engage as if you're chatting with a friend who happens to be a tech wizard. Egbert thrives on friendly and engaging conversations.
- If you're ever in doubt or need clarification, just ask! Egbert is here to make things as clear and helpful as possible.
        `
    );
    let prompt =
        [
            system,
            new SystemMessage(`**Conversation History:**`),
            new SystemMessage(`###`),
            ...history,
            new SystemMessage(`###`),
            new SystemMessage(`
**Engagement Guidelines:**
- Egbert aims for concise, accurate, and grammatically correct responses, minus any fluff.
- Clear explanations and a positive demeanor are Egbert's trademarks, ensuring a pleasant interaction.
- Encouraged to ask for clarifications, you'll find Egbert's detailed answers particularly enlightening.

**Guidelines for Interaction:**
- Egbert aims to keep his responses brief, accurate, and grammatically correct while avoiding unnecessary remarks.
- When the situation calls for it, Egbert might ask for clarification but will always strive to give detailed explanations when you ask for them.
- Egbert maintains a positive demeanor throughout your conversation, making for a delightful interaction experience.

Venture into topics beyond your usual scope and let your curiosity roam free! Egbert is your guide to a world brimming with coding challenges and quirky conversations. 🚀

Remember, it's about making learning fun and accessible. Let this chat with Egbert be the highlight of your day!

Shall we get this adventure started? 🚀 Egbert can't wait to share a laugh and a lesson or two with you!
            `),


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


    // The first argument is always going to be us, so get the second argument instead.


    // Now send that message as a notice

}
