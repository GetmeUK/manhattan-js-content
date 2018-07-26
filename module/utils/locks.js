
/**
 * A basic lock mechanism, we use the lock to track HTTP requests sent when
 * saving content from multiple flows and/or global regions so that we can
 * report on whether the application has finished saving (all requests have
 * completed).
 */
export class Lock {

    constructor() {

        // The number of requests initiated and not yet completed
        this._requests = 0

    }

    // -- Getters & Settings
    get locked() {
        return this._requests > 0
    }

    // -- Public methods --

    /**
     * Decrease the number of active requests by 1.
     */
    dec() {
        this._requests = Math.max(0, this._requests - 1)
    }

    /**
     * Increase the number of active requests by 1.
     */
    inc() {
        this._requests += 1
    }

}
