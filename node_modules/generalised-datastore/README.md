# Generalised Datastore

## Installation

```
npm install generalised-datastore --save
```

## Usage

```js
import GDS from "generalised-datastore";

// Initiate Datastore object
let gds = new GDS("ds1").sync();
// Create folders
let Folder1 = gds.folder("folder1");
let Folder2 = gds.folder("folder2");

/* Basic CRUD Queries */

// Write Queries
Folder1.write({ info: "info1" });
Folder1.write_several(new Array({ info: "info1" }, { info: "info2" }));

// Read Queries
Folder1.read(query);
Folder1.readone(query); // limit 1

// Update Queries
Folder1.update(read_query, update_query); // limit 1
Folder1.update_several(read_query, update_query);

// Remove Queries
Folder1.remove(query); // limit 1
Folder1.remove_several(query);

// Replace Queries
Folder1.replace(read_query, replacement); // limit 1
```

## Features

- ### Multi-depth (Read, Write) joins.

```js
Folder1.write({
  info: "info1",
  info2: {
    _id: "folder2~rand~time", // || "folder2"
    info: "info2",
  },
});
```

This stores:
`folder1 -> {_id: 'folder1~rand~time', info: 'info1', info2: 'folder2~rand~time'}`
`folder2 -> {_id: 'folder2~rand~time', info: 'info2'}`

- ### Subfolder

```js
let Posts_likes = gds.folder("postlikes", "post");
Posts_likes.write({
  post: "posts~1~time",
  liker: "user~xyz~time",
});
Posts_likes.write({
  post: "posts~2~time",
  liker: "user~abc~time",
});
Posts_likes.write({
  post: "posts~1~time",
  liker: "user~abc~time",
});
```

This stores:
`postslikes -> posts~1~time -> {_id: 'postslikes~rand~time', post: 'posts~1~time', liker: 'user~xyz~time'}\n`
                              `{_id: 'postslikes~rand1~time', post: 'posts~1~time', liker: 'user~abc~time'}`
`postslikes -> posts~2~time -> {_id: 'postslikes~rand~time', post: 'posts~2~time', liker: 'user~xyz~time'}`

- ### Dynamic Query extension
```js
Folder.add_query('has', (query)=>{
  return !!Folder.readone(query);
});

Folder.has('_id~xyz~123'); // returns bool

```

- ### Paging

- ### Event Handling

## Properties and Methods

### GDS

Type `class`

Properties
`constructor` parameters
`datastore_name`
`base_path`[optional]

| `Method Name` | Argument     | Argument Type         | Meaning                                                        |
| ------------- | ------------ | --------------------- | -------------------------------------------------------------- |
| `folder`      | folder_name  | string                | Folder's name.                                                 |
|               | subfolder    | string | string[]     | Folder entries property that would serve as `subfolder` group. |
|               | joins        | string | string[]     | Folder entries property that's `joined` from other folders.    |
| `sync`        | sync_handler | function | function[] | Function(s) that would be called on `sync` of the datastore.   |
### Folder

```js
let Folder = gds.folder("folder_name");
```

| Method Name      | Argument      | Argument Type       | Meaning                                                                              |
| ---------------- | ------------- | ------------------- | ------------------------------------------------------------------------------------ |
| `add_query`      | query         | string              | Query name.                                                                          |
|                  | handler       | function            | Handler that would be called on folder[query].                                       |
| `remove_query`   | query         | string              | Removes query from folder crud.                                                      |
| `read`           | query         | object | _id string | Read filter                                                                          |
|                  | options       | object              |                                                                                      |
| `readone`        |               |                     | *Same as `read`, only limit = 1.*                                                    |
| `remove`         | query         | object | _id string | Remove filter.                                                                       |
|                  | options       | object              |                                                                                      |
| `remove_several` |               |                     | *Same as `remove`, only limit is as many as match.*                                  |
| `replace`        |               |                     | *Syntactic method to perform remove and write operations in one call.*               |
|                  | replace_query | object | _id string | Query to match folder entry to be replaced i.e removed                               |
|                  | replacement   | object              | Data to replace removed folder entry                                                 |
|                  | options       | object              |                                                                                      |
| `write`          | data          | object              | Data to be written to folder.                                                        |
|                  | options       | object              |                                                                                      |
| `write_several`  |               |                     | *Same as `write`, only it accepts a data array and reiteratively `write` to folder.* |
| `update`         | query         | object | _id string | Query to filter folder entry for update                                              |
|                  | update_query  | object              | Update to be made on folder entry.                                                   |
|                  | options       | object              |                                                                                      |
| `update_several` |               |                     | *Same as `update`, only it update as many query-match as found in folder.*           |


## Exposing the Event Listener Decorator
| Method Name               | Argument   | Argument Type            | Meaning                                                                                                                                                                                                                                                        |
| ------------------------- | ---------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add_folder_listener`     | `listener` | function                 | Function(s) that would be called on folder creation.                                                                                                                                                                                                           |
| `add_listener`            | event      | string                   | Event name that would be fired on emit.                                                                                                                                                                                                                        |
|                           | listener   | function                 | Function that would be appended to event, for firing on emit.                                                                                                                                                                                                  |
| `add_query_listener`      | `listener` | function                 | Function(s) that would be called on (any) query call.                                                                                                                                                                                                          |
| `add_read_listener`       | `listener` | function                 | Function(s) that would be called on `read` queries.                                                                                                                                                                                                            |
| `add_remove_listener`     | `listener` | function                 | Function(s) that would be called on `remove` queries.                                                                                                                                                                                                          |
| `add_write_listener`      | `listener` | function                 | Function(s) that would be called on `write` queries.                                                                                                                                                                                                           |
| `add_update_listener`     | `listener` | function                 | Function(s) that would be called on `update` queries.                                                                                                                                                                                                          |
| emit                      | event      | string                   | Event that is being emitted.                                                                                                                                                                                                                                   |
|                           | payload    | any                      | Argument provided to listeners being called on event. A second argument (`this`) is provided to listeners being the object being listened on.                                                                                                                  |
|                           | callback   | function                 | A function that is called after all listeners has been called. The callback is given an argment, which is an array of the return values of the called listeners.                                                                                               |
| on_listener_added         | listener   | function                 | Function to be appended to listeners, called on a new listener added to `any` event.                                                                                                                                                                           |
|                           | remove     | "Boolean(truthy)"        | If provided, removes listener instead, as oppose to append.                                                                                                                                                                                                    |
| on_listener_removed       | listener   | function                 | Function to be appended to listeners, called on listener removed from `any` event.                                                                                                                                                                             |
|                           | remove     | "Boolean(truthy)"        | If provided, removes listener instead, as oppose to append.                                                                                                                                                                                                    |
| `on_read_file`            | listener   | function                 | Function appended to listeners array, to be called on file read as saved to disk, before any further parsing. If return truthy, return value is assigned as read file and recursively passed sequentially to other listeners for parsing if any.               |
|                           | remove     | Boolean(truthy)          | If provided, removes listener instead, as oppose to append.                                                                                                                                                                                                    |
| `on_user_query_listener`  | query      | string                   | User query to emit listeners on call.                                                                                                                                                                                                                          |
|                           | listener   | function                 | Function to be appended to user query listeners for call on emit.                                                                                                                                                                                              |
|                           | remove     | Boolean(truthy)          | If provided, removes listener instead, as oppose to append.                                                                                                                                                                                                    |
| `on_write_file`           | listener   | function                 | Function appended to listeners array, to be called on file to be saved to disk, with no further parsing. If return truthy, return value is assigned as value to be written to file, and recursively passed sequentially to other listeners for parsing if any. |
|                           | remove     | Boolean(truthy)          | If provided, removes listener instead, as oppose to append.                                                                                                                                                                                                    |
| `remove_event`            | event      | string                   | Event to be removed from events object, clearing all event's listeners.                                                                                                                                                                                        |
| `remove_folder_listener`  | listener   | function | Boolean(true) | Remove single listener if provided function, else if boolean-true, removes all `folder` listeners.                                                                                                                                                             |
| `remove_listener`         | event      | string                   | Event name whose listener is to be removed.                                                                                                                                                                                                                    |
|                           | listener   | function                 | Listener to be remove from event name provided.                                                                                                                                                                                                                |
| `remove_query_listener`   | listener   | function | Boolean(true) | Remove single listener if provided function, else if boolean-true, removes all `query` listeners                                                                                                                                                               |
| `remove_read_listener`    | listener   | function | Boolean(true) | Remove single listener if provided function, else if boolean-true, removes all `read` listeners                                                                                                                                                                |
| `remove_replace_listener` | listener   | function | Boolean(true) | Remove single listener if provided function, else if boolean-true, removes all `replace` listeners                                                                                                                                                             |
| `remove_remove_listener`  | listener   | function | Boolean(true) | Remove single listener if provided function, else if boolean-true, removes all `remove` listeners                                                                                                                                                              |
| `remove_write_listener`   | listener   | function | Boolean(true) | Remove single listener if provided function, else if boolean-true, removes all `write` listeners                                                                                                                                                               |
| `remove_update_listener`  | listener   | function | Boolean(true) | Remove single listener if provided function, else if boolean-true, removes all `update` listeners                                                                                                                                                              |

*Listeners are called with `this` object passed as first argument, the query response as second argument and query metadata as third argument.*

See the [package source](https://github.com/immanuel-savvy/GDS.git) for more details.

[npm-url]: https://npmjs.org/package/generalised-datastore
[downloads-url]: https://npmjs.org/package/generalised-datastore
