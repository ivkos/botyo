# Botyo

**Botyo** is a modular bot designed for group chat rooms on Facebook. It comes preinstalled with some fun and useful modules.

Botyo is written in Node.js, and runs in a multi-container Docker environment using Docker Compose.

## Requirements
* Node 6+
* Linux \*
* Docker
* Docker Compose

\* May also run on Docker for Windows (tested) and macOS (untested) with some limitations, due to the way Docker is implemented on those platforms.

**Botyo** can also be run without Docker on any Node.js-compatible platform, as long as it is configured correctly according to the instructions below.

## Download
```bash
git clone https://github.com/ivkos/botyo.git
```

## Running inside Docker
First, you need copy the provided example configuration file, and edit it using your favorite text editor:
```bash
cp config_example.yaml config.yaml
nano config.yaml
```

Then run the bot:
```bash
./run.sh
```
This will build all relevant Docker images, and then start the bot. It will run the app as a daemon in the background, so you can safely Ctrl-C out of the logs, and the bot will keep running.

To stop the bot and its dependent Docker containers:
```bash
./stop.sh
```

## Running without Docker
Copy the example configuration file into a new one, then edit it:
```bash
cp config_example.yaml config.yaml
nano config.yaml
```

Make sure you configure a correct URL to a running MongoDB server, for example:
```yaml
mongo:
  url: "mongodb://10.0.15.143:27017/botyo"
```

Set the state file to one in a directory you can write to, for example:
```yaml
app:
  stateFile: /home/botyo/data/app/appstate.json
```

Configure the rest of the options in the config file as per your liking.

Install the dependencies:
```bash
npm install
```

Build:
```bash
npm run build
```

Then run Botyo:
```bash
npm run start
```

## Extending

Modules reside in the `src/modules` directory. There a few types of modules:

* `CommandModule`
	* Defines a command with a specific name that the message should begin with in order for some action to be executed (e.g. `#quote zuck`).
	* Location: `src/modules/commands`
	* Commands get auto-discovered as long as they are in the directory above.
	* Enabled commands are listed in the output of the `#help` command.
	* Commands can be enabled or disabled from the `config.yaml` file.
* `FilterModule`
	* Defines intermediate actions that are applied to received messages. Can also be used to intercept incoming free-form text messages and act accordingly.
	* Location: `src/modules/filters`
	* The order in which messages get passed through filters should be manually defined in `config.yaml`. Unlisted filters are disabled.
* `ScheduledTask`
	* Defines a task that is executed periodically, as set in the `config.yaml` file.
	* Location: `src/modules/scheduled-tasks`
	* Scheduled tasks get auto-discovered as long as they are in the directory above.

In order for your modules to get auto-discovered and work correctly, they must extend one of the base classes above.

## Preinstalled Modules
### Commands
* `#help` - Responds with a list of all available commands.
* `#ae <text>` - Returns the text aesthetically (un)pleasing, e.g. "hello" becomes "ｈｅｌｌｏ".
* `#color <hex string>` - Changes the chat color.
* `#emojify <text>` - Returns the text emojified, i.e. every letter and number are replaced with emoji ones.
* `#lmgtfy <query>` - Googles that for you using [lmgtfy](https://lmgtfy.com/)
* `#ping` - Makes the bot respond to the ping if it is online.
* `#quote <person | me | all | *>` - Generates a faux quote using Markov chains based on messages in the chat.
	* `#quote <person>` - Quotes a specific person identified by their name, chat nickname, custom alias (as defined in `config.yaml`), Facebook username, or a string that is close enough to those. This works by calculating the similarity of the string to the participants' identifiers, so for example `#quote abi` would quote Abigail.
	* `#quote me` or simply `#quote` - Quotes the sender of the message.
	* `#quote all` or `#quote *` - Builds a Markov chain based on all but the bot's messages in the chat, and generates an anonymous quote.
* `#showme [number of images] <query>` - Returns the first few pictures found in Google Images matching the query. This command is disabled by default because it requires manual configuration of API keys needed to use the Google Search APIs. See `config.yaml` for instructions how to configure.
	* `#showme cat` - Shows you a picture of a cat.
	* `#showme 3 cats` - Shows you three pictures of cats.
	* `#showme "3 cats"` - Shows you a picture of three cats.
* `#spotify <track>` - Posts a Spotify track in the chat. It is recommended to change the `market` option to your country code in `config.yaml` in order for songs to be playable.
    * `#spotify Don't Let Me Down`
    * `#spotify Tyga - Dope` - you can optionally include the artist for a more relevant result
* `#stats` - Returns some stats for the chat, including but not limited to number of messages and number of participants.
* `#translate [([from:]to)] <text>` - Translates text using Google Translate. Examples:
    * `#translate (en:fr) Hello!` - Translates "Hello!" from English to French
    * `#translate (english:french) Hello!` - Ditto. Full language names can also be used, case insensitive
    * `#translate (French) Hello!` - Automatically detects the language and translates to French
    * `#translate Bonjour!` - Automatically detects the language and translates to the default language set in `config.yaml`
* `#whodis` - Runs a reverse image search on the last picture sent to the chat, and gives you links to the results.

### Filters
* `AutoEmojifyFilter` - Listens for messages containing emojifiable parts (e.g. "E X A M P L E"), emojifies them, and responds with the same message.
* `HeIsRisenFilter` - Says "[name] is risen!" if a person sends a message for the first time in a while, as configured in `config.yaml`.