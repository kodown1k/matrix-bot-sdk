import sql from "../utils/db";
import {MessageEvent, MessageEventContent} from "matrix-bot-sdk";
import {LogService} from "../help/LogService";

export class Query {

    query;
    data: object;
    roomId: string;
    sender: string;

    constructor(event: MessageEvent<MessageEventContent>, roomId: string, textBody: string) {
        this.query = textBody
        this.data = event;
        this.roomId = roomId;
        this.sender = event.sender.replace(':matrix.narogu.net', '');
    }

    getSender() {
        return this.sender
    }

    async save() {
        const [row] = await sql`
            insert into query (query, data, room, sender)
            values (${this.query}, ${sql(this.data)}, ${this.roomId}, ${this.sender}) returning *
        `
        LogService.debug('row', row)
        return row
    }

    async history() {
        const rows = await sql`
            select query, answer, sender
            from query
            where room = ${this.roomId}
            order by insert_time desc  limit 10 
        `;
        const init = '';
        const historyPrompt = rows.map((v) =>
            `User ${v.sender} ask:${v.query}`
            + (v.answer ? ('Your response is: ' + v.answer +'\n '): '')
        )

        return historyPrompt.join("\n");
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