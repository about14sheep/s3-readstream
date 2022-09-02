import {Readable, ReadableOptions} from "stream";
import type {S3} from "aws-sdk";

export type S3ReadStreamOptions = {
  parameters: S3.GetObjectRequest;
  s3: S3;
  maxLength: number;
  byteRange?: number;
}

export class S3ReadStream extends Readable {
	_currentCursorPosition = 0;
	_s3DataRange: number;
	_maxContentLength: number;
	_s3: S3;
	_s3StreamParams: S3.GetObjectRequest;

	constructor(
    options: S3ReadStreamOptions,
		nodeReadableStreamOptions?: ReadableOptions
	) {
		super(nodeReadableStreamOptions);
		this._maxContentLength = options.maxLength;
		this._s3 = options.s3;
		this._s3StreamParams = options.parameters;
    this._s3DataRange = options.byteRange || 1024 * 1024;
	}
  
  adjustByteRange(bytes: number) {
    this._s3DataRange = bytes;
  }

	_read() {
		if (this._currentCursorPosition > this._maxContentLength) {
			this.push(null);
		} else {
			const range = this._currentCursorPosition + this._s3DataRange;
			const adjustedRange =
				range < this._maxContentLength ? range : this._maxContentLength;
			this._s3StreamParams.Range = `bytes=${this._currentCursorPosition}-${adjustedRange}`;
			this._currentCursorPosition = adjustedRange + 1;
			this._s3.getObject(this._s3StreamParams, (error, data) => {
				if (error) {
					this.destroy(error);
				} else {
					this.push(data.Body);
				}
			});
		}
	}
}

