import * as path from 'path';

import micromatch = require('micromatch');

import { IOptions } from '../managers/options';
import { ITask } from '../managers/tasks';

import { IEntry, IReaddirOptions } from 'readdir-enhanced';
import { Pattern } from '../types/patterns';

export default abstract class Reader {
	constructor(public readonly options: IOptions) { }

	/**
	 * The main logic of reading the directories that must be implemented by each providers.
	 */
	public abstract read(_task: ITask): any; /* tslint:disable-line no-any */

	/**
	 * Returns root path to scanner.
	 */
	public getRootDirectory(task: ITask): string {
		return path.resolve(this.options.cwd, task.base);
	}

	/**
	 * Returns options for reader.
	 */
	public getReaderOptions(task: ITask): IReaddirOptions {
		return {
			basePath: task.base === '.' ? '' : task.base,
			filter: (entry) => this.filter(entry, task.patterns, task.negative),
			deep: (entry) => this.deep(entry, task.negative),
			sep: '/'
		};
	}

	/**
	 * Returns true if entry must be added to result.
	 */
	public filter(entry: IEntry, patterns: Pattern[], negative: Pattern[]): boolean {
		// Filter directories that will be excluded by deep filter
		if (entry.isDirectory() && micromatch.any(entry.path, negative)) {
			return false;
		}

		// Filter files and directories by options
		if ((this.options.onlyFiles && !entry.isFile()) || (this.options.onlyDirectories && !entry.isDirectory())) {
			return false;
		}

		// Filter by patterns
		const entries = micromatch([entry.path], patterns, { dot: this.options.dot });

		return entries.length !== 0;
	}

	/**
	 * Returns true if directory must be read.
	 */
	public deep(entry: IEntry, negative: Pattern[]): boolean {
		if (this.options.deep === false) {
			return false;
		}

		if (typeof this.options.deep === 'number') {
			if (entry.depth > this.options.deep) {
				return false;
			}
		}

		return !micromatch.any(entry.path, negative);
	}

	/**
	 * Returns true if error has ENOENT code.
	 */
	public isEnoentCodeError(err: NodeJS.ErrnoException): boolean {
		return err.code === 'ENOENT';
	}
}
