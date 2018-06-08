# Botyo
[![npm](https://img.shields.io/npm/v/botyo.svg)](https://www.npmjs.com/package/botyo-bundle-instagram)
[![npm](https://img.shields.io/npm/dt/botyo.svg)](https://www.npmjs.com/package/botyo-bundle-instagram)
![npm](https://img.shields.io/npm/l/botyo.svg)

**Botyo** is a modular bot designed for group chat rooms on Facebook. It is designed with flexibility and modularity 
in mind.


## Requirements
* Node.js >= 8.3.0


## Install
`npm install --save botyo`


## Documentation

Documentation for Botyo is available here:
* [Botyo Documentation](https://ivkos.github.io/botyo)
* [Botyo API Documentation](https://ivkos.github.io/botyo-api)


## Quick Start
Please explore the [Botyo Example Project](https://github.com/ivkos/botyo-example) to jump start your project.


## Modules
> **Want to see your module for Botyo here?** 
Please refer to the [Botyo API](https://github.com/ivkos/botyo-api) 
for documentation on how to develop modules for Botyo. 
Then submit a PR with a link to your module to have it included in this list.


### Bundles
> Bundles are collections of multiple modules.

* [Instagram Bundle](https://github.com/ivkos/botyo-bundle-instagram) - 
modules providing some useful Instagram integrations

* [Persistence Bundle](https://github.com/ivkos/botyo-bundle-persistence) - 
components related to the persistence of messages in a MongoDB database


### Commands
> Commands are modules that handle commands that users can send to the bot. 
Commands must begin with a prefix that can be configured globally, 
or on a per-chat-thread or per-user basis.

* [Ping Command](https://github.com/ivkos/botyo-command-ping) - 
sends a ping in a private message to a specific person, 
or makes the bot respond to the ping sent by the participants of a chat thread

* [Quote Command](https://github.com/ivkos/botyo-command-quote) - 
uses Markov chains to generate quotes based on messages sent by the participants of a chat thread

* [Reverse Image Search Command](https://github.com/ivkos/botyo-command-reverse-image-search) - 
runs a reverse image search on the last uploaded picture and posts links to the results 
from Google Images, Bing Images, and TinEye

* [ShowMe Command](https://github.com/ivkos/botyo-command-showme) - 
returns the first few images found in Google Images matching a query

* [Spotify Command](https://github.com/ivkos/botyo-command-spotify) - 
posts a Spotify song to the chat 

* [YouTube Command](https://github.com/ivkos/botyo-command-youtube) - 
posts a YouTube video to the chat


### Filters
> Filters are modules that manipulate or filter out messages as they arrive.

### Scheduled Tasks
> A scheduled task is module that defines a task that is 
executed periodically or upon the start of the bot.
