import sql from "../utils/db";
import {MessageEvent, MessageEventContent} from "matrix-bot-sdk";
import {LogService} from "../help/LogService";
import {AIMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";

export class Query {

    query;
    data: object;
    roomId: string;
    sender: string;
    relatesToId: string;

    constructor(event: MessageEvent<MessageEventContent>, roomId: string, textBody: string) {
        this.query = textBody
        this.data = event;
        this.roomId = roomId;
        this.sender = event.sender.replace(':matrix.narogu.net', '');
        this.relatesToId = event.content["m.relates_to"]?.event_id ?? event.eventId;
    }

    getSender() {
        return this.sender
    }

    async save() {
        const [row] = await sql`
            insert into query (query, data, room, sender, relates_to_id)
            values (${this.query}, ${sql(this.data)}, ${this.roomId}, ${this.sender}, ${this.relatesToId}) returning *
        `
        LogService.debug('row', row)
        return row
    }

    async history() {
        const rows = await sql`
            select query, answer, sender, insert_time
            from query
            where relates_to_id = ${this.relatesToId}
            order by insert_time desc limit 20
        `;
        let init = '';
        const historyPrompt = Array();
        rows.forEach((v) => {
            init += `
            \n
            - At ${v.insert_time}, ${v.sender.substring(1)} sent message: ${v.query}
              AI (Egbert) response: ${v.answer}
              \n
            `
        });

        return [new SystemMessage(init)];
    }

    static async isInReplies(id: string) {
        const rows = await sql`
            select true
            from query
            where relates_to_id = ${id} limit 1
        `;
        return rows.length > 0
    }
}

export class Answer {
    queryId: string;
    answer: string;

    constructor(queryId: string, answer: string) {
        this.queryId = queryId;
        this.answer = answer;
    }

    async save() {
        await sql`update query
                  set answer=${this.answer}
                  where id = ${this.queryId}`
    }
}
