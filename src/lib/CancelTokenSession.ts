import * as events from 'eventemitter3';
import { CancelToken, CancelTokenEvents } from './CancelToken';

/**
 * @description A class that represents a session for a set of promise tokens
 * @class PromiseSession
 */
export class CancelTokenSession {

    private _outstanding = new Set<CancelToken>();
    private _emitter = new events.EventEmitter();
    private _isCanceling = false;

    /**
     * Returns true / false whether or not the session is in the process of canceling
     * @returns {boolean} true if the session is canceling. false otherwise
     * @memberOf CancelTokenSession
     */
    isCanceling():boolean {
        return this._isCanceling;
    }

    /**
     * Pauses all
     * @param {boolean} paused
     * @memberOf CancelTokenSession
     */
    setPaused(paused: boolean) {
        this._outstanding.forEach(token => token.setPaused(paused));
    }

    /**
     * Cancels the current session. Session should not be reused after calling cancel
     * @returns {Promise<any>} resolved when all internal promises have resolved
     * @memberOf CancelTokenSession
     */
    cancel(): Promise<any> {
        this._isCanceling = true;
        let wrappedPromises: Promise<any>[] = [];
        this._outstanding.forEach(token => {
            token.cancel();
            wrappedPromises.push(token.getWrappedPromise());
        });
        this._outstanding.clear();

        this._emitter.emit(CancelTokenEvents.CANCEL_STARTED);
        
        const done = () => {
            this._emitter.emit(CancelTokenEvents.CANCEL_FINISHED);
            this._isCanceling = false;
            this.clear();
        };

        // We wait for all wrapped promises to resolve
        return Promise.all(wrappedPromises).then(() => {
            done();
        }).catch(e => {
            done();
            throw e;
        });
    }

    /**
     * Number of outstanding promises
     * @returns {number}
     * @memberOf CancelTokenSession
     */
    size(): number {
        return this._outstanding.size;
    }

    /**
     * Waits for all outstanding promises to complete
     * This refers to the internal promises, not the wrapped promises that were returned
     * This promise is rejected immediately when the session gets canceled
     * @param {boolean} [rejectImmediatelyOnCancel=true] - Whether we should reject immediately when
     * canceled or when the cancel promise is resolved.
     * @returns {Promise<void>}
     * @memberOf CancelTokenSession
     */
    waitForAll(rejectImmediatelyOnCancel=true): Promise<void> {
        if (this._outstanding.size === 0) {
            return Promise.resolve();
        } else {
            return new Promise<void>((resolve, reject) => {
                let allDoneHandler = () => done();
                let canceledHandler = () => done(new Error(`Promise session canceled`));

                // When done, either with error or no error, we clean up listeners and resolve/reject
                const done = (error?: Error | string) => {
                    this._emitter.removeListener(CancelTokenEvents.ALL_DONE, allDoneHandler);
                    this._emitter.removeListener(CancelTokenEvents.CANCEL_STARTED, canceledHandler);
                    this._emitter.removeListener(CancelTokenEvents.CANCEL_FINISHED, canceledHandler);
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                };

                // We wait for either of these events
                this._emitter.once(CancelTokenEvents.ALL_DONE, allDoneHandler);
                if (rejectImmediatelyOnCancel) {
                    this._emitter.once(CancelTokenEvents.CANCEL_STARTED, canceledHandler);
                } else {
                    this._emitter.once(CancelTokenEvents.CANCEL_FINISHED, canceledHandler);
                }
            }).then(() => {
                this.clear();
            });
        }
    }

    /**
     * Wraps a promise with a token and adds to this session
     * @param {Promise<T>} promise
     * @returns {Promise<T>}
     * @memberOf CancelTokenSession
     */
    wrap<T>(promise: Promise<T>): Promise<T> {
        const token = new CancelToken(promise);
        return this.addToken(token);
    }

    /**
     * Adds a cancel token to this session
     * @template T
     * @param {CancelToken} token
     * @memberOf CancelTokenSession
     */
    addToken<T>(token: CancelToken): Promise<T> {
        if (this._isCanceling) {
            throw new Error(`Can't add new token when session is canceling`);
        }
        this._outstanding.add(token);
        // We remove the token from the list out outstanding promises regardless of outcome
        return token.promise
            .then((data) => {
                this._removeOutstanding(token);
                return data; // Pass data forward to the caller
            })
            .catch(error => {
                this._removeOutstanding(token);
                throw error; // Allows caller code to handle error
            });
    }

    /**
     * Clears the current state of the promise session
     */
    clear() {
        this._outstanding.clear();
        this._emitter.removeAllListeners();
        this._isCanceling = false;
    }

    private _removeOutstanding(token: CancelToken) {
        this._outstanding.delete(token);
        if (this._outstanding.size === 0) {
            this._emitter.emit(CancelTokenEvents.ALL_DONE);
        }
    }
}
