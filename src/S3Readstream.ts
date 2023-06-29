import {Readable, ReadableOptions} from "stream";
import type { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export type S3ReadStreamOptions = {
  s3: S3Client;
  command: GetObjectCommand;
  maxLength: number;
  byteRange?: number;
}

export class S3ReadStream extends Readable {
	_s3: S3Client;
	_command: GetObjectCommand;
	_currentCursorPosition = 0;
	_s3DataRange: number;
	_maxContentLength: number;

	constructor(
    options: S3ReadStreamOptions,
		nodeReadableStreamOptions?: ReadableOptions
	) {
		super(nodeReadableStreamOptions);
		this._maxContentLength = options.maxLength;
		this._s3 = options.s3;
		this._command = options.command;
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

	async _read() {
		if (this._currentCursorPosition >= this._maxContentLength) {
			this.push(null);
		} else {
			const range = this._currentCursorPosition + this._s3DataRange;
			const adjustedRange =
				range < this._maxContentLength ? range : this._maxContentLength;
			this._command.input.Range = `bytes=${this._currentCursorPosition}-${adjustedRange}`;
			this._currentCursorPosition = adjustedRange + 1;

      try {
        const response = await this._s3.send(this._command);
        const data = await response.Body.transformToByteArray();
        this.push(data);
      } catch (error) {
        this.destroy(error);
      }
		}
	}
}

