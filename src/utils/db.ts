import postgres from "postgres";


const sql = postgres({
    host: process.env.DB_HOST,
    // tslint:disable-next-line:radix
    port: parseInt(process.env.DB_PORT ?? '25432'),
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    transform: {
        undefined: null
    },
});


export default sql;
