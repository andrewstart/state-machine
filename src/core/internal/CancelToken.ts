import {CancelHandler} from '../types';
/**
 * Wraps a promise so that it can be cancelled, and if so does not resolve to
 * the rest of its chain.
 * @internal
 */
export class CancelToken {
    /**
     * The wrapped promise of this token
     */
    public promise: Promise<any>;

    private _canceled = false;
    private _onCancel?: CancelHandler;

    /**
     * Creates an instance of CancelToken.
     * @param wrappedPromise The promise to wrap
     * @param onCancel Handler function for cancel events
     */
    constructor(wrappedPromise: Promise<any>, onCancel?: CancelHandler) {
        this._onCancel = onCancel;
        this.promise = new Promise<any>((resolve, reject) => {
            wrappedPromise.then((data) => {
                if (!this._canceled) {
                    resolve(data);
                }
            }, err => {
                if (!this._canceled) {
                    reject(err);
                }
            });
        });
    }

    /**
     * Cancels the current promise.
     */
    cancel() {
        this._canceled = true;
        if (this._onCancel) {
            this._onCancel();
        }
    }
}