# s3-readstream
AWS S3 Read Stream made easy

Simple wrapper around [AWS S3Client GetObjectCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/getobjectcommand.html)'s grab-by-range call allowing intuitive and stable smart streaming.
* ZERO Dependencies
* Simple interface for streaming any size file from AWS S3
* Easily speed-up, and slow down, the streaming at any point
* All of the functionaly you love with NodeJS Readable streams
* Drop in replacement for `(await S3Client.send(new GetObjectCommand())).Body`

## AWS v3 updates
Since AWS updated their SDK to be more modular, it introduced breaking changes into version 1 of this package. So we have updated as well! Going forward, version 2 of this package will *only* work with the new AWS v3 SDK. However, if your project still uses AWS v2 sdk, you can use the npm tag `sdk` to install version 1 of this package. Checkout the [documentation on version 1](https://github.com/about14sheep/s3-readstream/tree/v1#s3-readstream).

## Installing the package
To install the package:
```
npm install s3-readstream
```

## Using the package
You can integrate the `S3ReadStream` class with the [`@aws-sdk/clientS3`](https://www.npmjs.com/package/@aws-sdk/client-s3) package easily:

```js
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import {S3ReadStream} from 's3-readstream';
// Pass in your AWS S3 credentials
const s3 = new S3Client({
    region: "us-east-1",
    credentials: {
        accessKeyId: s3Env.accessKey,
        secretAccessKey: s3Env.secret
    }
});

const bucketParams = {
  Bucket: s3Env.bucket, // S3 Bucket Path
  Key: s3Env.key // S3 file
};

// Grab the headobject like normal to get the length of the file
const headObjectCommand = new HeadObjectCommand(bucketParams);
const headObject = await s3.send(headObjectCommand);

// Because AWS sdk is now modular, pass in the `GetHeadObject` command
const options = {
  s3,
  command: new GetObjectCommand(bucketParams),
  maxLength: headObject.ContentLength,
  byteRange: 1024 * 1024 // 1 MiB (optional - defaults to 64kb)
};

// Instantiate the S3ReadStream in place of (await S3Client.send(new GetObjectCommand())).Body
const stream = new S3ReadStream(options);
```
### Adjusting the read stream
To adjust the range of bytes grabbed from S3:
```js
// You can adjust the range at any point during the stream (adjusting the speed)
stream.adjustByteRange(1024 * 1024 * 5); // 5 MiB
```
To adjust cursor position:
```js
// You can move the cursor forwards to skip ahead (or back) in the file
// By default, the stream will skip ahead by the current Range
stream.moveCursorForward();
stream.moveCursorBack();

// Both of these methods also take in a `bytes` parameter for finer control
stream.moveCursorForward(10 * 1024); // Move cursor forward 10 KiB in file
stream.moveCursorBack(5 * 1024); // Move cursor back 5 KiB in file
```
### Inherited features from NodeJS Readable class
You can alse use this `S3ReadStream` like any other [NodeJS Readable stream](https://nodejs.org/api/stream.html#readable-streams), setting an event listener is exactly the same:
```js
stream.on('data', (chunk) => {
  console.log(`read: ${chunk.toString()}`);
});
stream.on('end', () => {
  console.log('end');
});
```
To work with zipped files:
```js
import {createGunzip} from 'zlib';

const gzip = createGunzip();
// pipe into gzip to unzip files as you stream!
stream.pipe(gzip);
```

## API
### `S3ReadStream(options: S3ReadStreamOptions)`
Instantiates a new `S3ReadStream` object.

Parameters:
* `options` (S3ReadStreamOptions) - Container object to hold options
  *  `options.parameters` ([S3.GetObjectRequest](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html#API_GetObject_RequestSyntax)) - Parameters to pass into S3 `getObject` method call
  * `options.s3` ([S3](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Operations_Amazon_Simple_Storage_Service.html)) - Resolved S3 object
  * `options.maxLength` (number) - Total length of file in S3 bucket
  * `options.byteRange` (number) - (optional) Range of bytes to grab in S3 `getObject` call (defaults to 64 KiB)
* `nodeReadableStreamOptions` ([ReadableOptions](https://nodejs.org/api/stream.html#new-streamreadableoptions)) - (optional) NodeJs Readable options to pass to super call
### `adjustByteRange(bytes: number)`
Adjusts the `S3ReadStream._s3DataRange` property. Can be used to slow down or speed up the stream by grabbing a smaller or larger range of bytes.

Parameter:
* `bytes` (number) - New range of bytes to set
### `moveCursorForward(bytes: number)`
Drains the internal buffer and adjusts the `S3ReadStream._currentCusorPosition` property moving the cursor forward `bytes` amount.
If current cursor position + number of bytes to move forward is > the length of the file, set cursor at end of file 

Parameter:
* `bytes` (number) - (optional) Number of bytes to move forward (defaults to current range)
### `moveCursorBack(bytes: number)`
Drains the internal buffer and adjusts the `S3ReadStream._currentCusorPosition` property moving the cursor back `bytes` amount.
If current cursor position - number of bytes to move back is <= 0, set cursor at begining of file

Parameter:
* `bytes` (number) - (optional) Number of bytes to move forward (defaults to current range)

## Example
See `s3-readstream` in action in an [HD video streaming app example](https://github.com/about14sheep/awsstreaming) and read a [blog on its origins](https://dev.to/about14sheep/streaming-data-from-aws-s3-using-nodejs-stream-api-and-typescript-3dj0).
