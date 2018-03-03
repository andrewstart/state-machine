import { CancelToken, CancelHandler } from './CancelToken';

/**
 * @description A class that represents a session for a set of promise tokens
 */
export class CancelTokenSession {
    private _outstanding = new Set<CancelToken>();

    /**
     * Cancels the current session.
     */
    cancel(): void {
        this._outstanding.forEach(token => {
            token.cancel();
        });
        this.clear();
    }

    /**
     * Number of outstanding promises
     * @returns {number}
     */
    size(): number {
        return this._outstanding.size;
    }

    /**
     * Wraps a promise with a token and adds to this session
     * @param {Promise<T>} promise
     * @param {CancelHandler} [onCancel] - Handler function for cancel events
     * @returns {Promise<T>}
     */
    wrap<T>(promise: Promise<T>, onCancel?:CancelHandler): Promise<T> {
        const token = new CancelToken(promise, onCancel);
        return this.addToken(token);
    }

    /**
     * Adds a cancel token to this session
     * @template T
     * @param {CancelToken} token
     */
    addToken<T>(token: CancelToken): Promise<T> {
        this._outstanding.add(token);
        // We remove the token from the list out outstanding promises regardless of outcome
        return token.promise
            .then((data) => {
                this._outstanding.delete(token);
                return data; // Pass data forward to the caller
            })
            .catch(error => {
                this._outstanding.delete(token);
                throw error; // Allows caller code to handle error
            });
    }

    /**
     * Clears the current state of the promise session
     */
    clear() {
        this._outstanding.clear();
    }
}
