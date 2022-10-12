# s3-readstream
AWS S3 Read Stream made easy

Simple wrapper around [AWS S3 getObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html)'s grab-by-range call allowing intuitive and stable smart streaming.
* Simple interface for streaming any size file from AWS S3
* Easily speed-up, and slow down, the streaming at any point
* All of the functionaly you love with NodeJS Readable streams
* Drop in replacement for `AWS.S3.getObject().createReadStream()`


## Installing the package
To install the package:
```
npm install s3-readstream
```

## Using the package
You can integrate the `S3ReadStream` class with the [`aws-sdk`](https://www.npmjs.com/package/aws-sdk) package easily:

```js
import * as AWS from 'aws-sdk';
import {S3ReadStream} from 's3-readstream';
// Pass in your AWS S3 credentials
const s3 = new AWS.S3({
  accessKeyId: s3Env.accessKey,
  secretAccessKey: s3Env.secret
});

const bucketParams = {
  Bucket: s3Env.bucket, // S3 Bucket Path
  Key: s3Env.key // S3 file
};

// Check the headobject like normal to get the length of the file
s3.headObject(bucketParams, (error, data) => {
    const options = {
        parameters: bucketParams,
        s3,
        maxLength: data.ContentLength,
        byteRange: 1024 * 1024 // 1 MiB (optional - defaults to 64kb)
    };
    // Instantiate the S3ReadStream in place of s3.getObject().createReadStream()
    const stream = new S3ReadStream(options);
});
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

Parameter:
* options (S3ReadStreamOptions) - Container object to hold options
  *  parameters ([S3.GetObjectRequest](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html#API_GetObject_RequestSyntax)) - Parameters to pass into S3 `getObject` method call
  * s3 ([S3](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Operations_Amazon_Simple_Storage_Service.html)) - Resolved S3 object
  * maxLength (number) - Total length of file in S3 bucket
  * byteRange (number) - (optional) Range of bytes to grab in S3 `getObject` call (defaults to 64 KiB)
* nodeReadableStreamOptions ([ReadableOptions](https://nodejs.org/api/stream.html#new-streamreadableoptions)) - (optional) NodeJs Readable options to pass to super call
### `adjustByteRange(bytes: number)`
Adjusts the `S3ReadStream._s3DataRange` property. Can be used to slow down or speed up the stream by grabbing a smaller or larger range of bytes.

Parameter:
* bytes (number) - New range of bytes to set
### `moveCursorForward(bytes: number)`
Adjust the `S3ReadStream._currentCusorPosition` property moving the cursor forward `bytes` amount.

Parameter:
* bytes (number) - (optional) Number of bytes to move forward (defaults to current range)
### `moveCursorBack(bytes: number)`
Adjust the `S3ReadStream._currentCusorPosition` property moving the cursor back `bytes` amount.

Parameter:
* bytes (number) - (optional) Number of bytes to move forward (defaults to current range)

## Example
See `s3-readstream` in action in an [HD video streaming app example](https://github.com/about14sheep/awsstreaming) and read a [blog on its origins](https://dev.to/about14sheep/streaming-data-from-aws-s3-using-nodejs-stream-api-and-typescript-3dj0).
