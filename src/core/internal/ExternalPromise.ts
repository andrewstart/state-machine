/**
 * A promise wrapper that exposes the resolve and reject methods of a promise
 * @internal
 */
export class ExternalPromise<T> {
    /**
     * Should be called to resolve the promise of this wrapper
     */
    public resolve: (data: T) => void;
    /**
     * Should be called to reject the promise of this wrapper
     */
    public reject: (error: T) => void;
    /**
     * The promise that is wrapped in this wrapper
     */
    public promise: Promise<T>;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}