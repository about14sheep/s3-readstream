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
    this._s3DataRange = options.byteRange || 64 * 1024;
	}

  private drainBuffer() {
    while(this.read());
  }

  /**
   * Adjust size of range to grab from S3 
   *
   * @param {number} bytes - Number of bytes to set for range
  */
  adjustByteRange(bytes: number) {
    this._s3DataRange = bytes;
  }

  /**
   * Drains the internal buffer and
   * moves cursor bytes length back in file 
   *
   * If current cursor position - number of bytes to move back 
   * is <= 0, set cursor at begining of file
   * @param {number} bytes - Number of bytes to subtract from cursor (defaults to range)
  */
  moveCursorBack(bytes: number = this._s3DataRange) {
    this.drainBuffer();
    if (this._currentCursorPosition - bytes > 0) {
      this._currentCursorPosition -= bytes;
    } else {
      this._currentCursorPosition = 0;
    }
  }

  /**
   * Drains the internal buffer and 
   * moves cursor bytes length forward in file
   *
   * If current cursor position + number of bytes to move forward 
   * is > the length of the file, set cursor at end of file 
   * @param {number} bytes - Number of bytes to add to cursor (defaults to range)
  */
  moveCursorForward(bytes: number = this._s3DataRange) {
    this.drainBuffer();
    if (this._currentCursorPosition + bytes <= this._maxContentLength) {
      this._currentCursorPosition += bytes;
    } else {
      this._currentCursorPosition += this._maxContentLength + 1;
    }
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

