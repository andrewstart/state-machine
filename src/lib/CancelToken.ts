import * as events from 'eventemitter3';

export const CancelTokenEvents = {
    UNPAUSED: 'UNPAUSED',
    ALL_DONE: 'ALL_DONE',
    CANCEL_STARTED: 'CANCEL_STARTED',
    CANCEL_FINISHED: 'CANCEL_FINISHED',
};

export type CancelHandler = () => void;

/**
 * @description Represests
 * @class CancelToken
 */
export class CancelToken {

    /**
     * The wrapped promise of this token
     * @type {Promise<T>}
     * @memberOf CancelToken
     */
    public promise: Promise<any>;

    private _paused = false;
    private _canceled = false;
    private _emitter = new events.EventEmitter();
    private _onCancel?: CancelHandler;
    private _wrappedPromise: Promise<any>;

    /**
     * Creates an instance of CancelToken.
     * @param {Promise<T>} wrappedPromise - The promise to wrap
     * @param {CancelHandler} [onCancel] - Handler function for cancel events
     * @memberOf CancelToken
     */
    constructor(wrappedPromise: Promise<any>, onCancel?: CancelHandler) {
        this._wrappedPromise = wrappedPromise;
        this._onCancel = onCancel;
        this.promise = new Promise<any>((resolve, reject) => {

            const done = (error?: Error|string, data?: any) => {
                this._emitter.removeAllListeners();
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            };

            wrappedPromise.then((data) => {
                if (this._paused) {
                    this._emitter.once(CancelTokenEvents.UNPAUSED, () => done(null, data));
                } else if (!this._canceled) {
                    done(null, data);
                }
            }).catch(err => {
                if (this._paused) {
                    this._emitter.once(CancelTokenEvents.UNPAUSED, () => done(err));
                } else if (!this._canceled) {
                    done(err);
                }
            });
        });
    }

    /**
     * Returns the promise this token created wrapping the internal promise
     * @returns {Promise<any>} The internal wrapped promise
     * @memberOf CancelToken
     */
    getTokenPromise(): Promise<any> {
        return this.promise;
    }

    /**
     * Returns the internal promise that this cancel token wraps
     * @returns {Promise<any>} The internal wrapped promise
     * @memberOf CancelToken
     */
    getWrappedPromise(): Promise<any> {
        return this._wrappedPromise;
    }

    /**
     * Sets the paused status of this promise session
     * @param {boolean} paused
     * @memberOf PromiseSession
     */
    setPaused(paused: boolean) {
        const oldPaused = this._paused;
        this._paused = paused;
        if (oldPaused && !paused) {
            this._emitter.emit(CancelTokenEvents.UNPAUSED);
        }
    }

    /**
     * Returns the paused status of this promise session
     * @returns {boolean}
     * @memberOf PromiseSession
     */
    isPaused(): boolean {
        return this._paused;
    }

    /**
     * Is this token canceled
     * @returns {boolean}
     * @memberOf CancelToken
     */
    isCanceled(): boolean {
        return this._canceled;
    }

    /**
     * Cancels the current session. Session should not be reused after calling cancel
     * @memberOf PromiseSession
     */
    cancel() {
        this._canceled = true;
        if (this._onCancel) {
            this._onCancel();
        }
    }
}
