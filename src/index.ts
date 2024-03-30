import {
    AutojoinRoomsMixin, ICryptoStorageProvider,
    LogLevel,
    LogService, MatrixAuth,
    MatrixClient,
    PantalaimonClient,
    RichConsoleLogger, RustSdkCryptoStorageProvider,
    SimpleFsStorageProvider
} from "matrix-bot-sdk";
import * as path from "path";
import config from "./config";
import CommandHandler from "./commands/handler";
import {log} from "node:util";



// First things first: let's make the logs a bit prettier.
LogService.setLogger(new RichConsoleLogger());

// For now let's also make sure to log everything (for debugging)
LogService.setLevel(LogLevel.ERROR);

// Also let's mute Metrics, so we don't get *too* much noise
LogService.muteModule("Metrics");

// Print something so we know the bot is working
LogService.info("index", "Bot starting...");


// This is the startup closure where we give ourselves an async context
(async function () {
    // Prepare the storage1 system for the bot
    const storage = new SimpleFsStorageProvider(path.join(config.dataPath, "bot.json"));

    // Prepare a crypto store if we need that
    let cryptoStore: ICryptoStorageProvider;
    if (config.encryption) {
        cryptoStore = new RustSdkCryptoStorageProvider(path.join(config.dataPath, "encrypted"));
    }


    // const auth = new MatrixAuth(config.homeserverUrl);
    // const client = await auth.passwordLogin(config.username, config.password);
    // console.log(client.accessToken);
    // Now create the client
    const client = new MatrixClient(config.homeserverUrl, config.accessToken, storage, cryptoStore);

    // Set up the autojoin mixin (if enabled)
    if (config.autoJoin) {
        AutojoinRoomsMixin.setupOnClient(client);
    }

    // Prepare the command handler
    const commands = new CommandHandler(client);
    await commands.start();

    LogService.info("index", "Starting sync...");
    await client.start(); // This blocks until the bot is killed
})();
