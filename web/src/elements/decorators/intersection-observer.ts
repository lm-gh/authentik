/**
 * @file Intersection Observer Decorator for LitElement
 */

import { LitElement } from "lit";
import { property } from "lit/decorators.js";

/**
 * Type for the decorator
 */
export type IntersectionDecorator = <T extends LitElement>(target: T, propertyKey: keyof T) => void;

function findNearestBoxTarget(element?: Element | null): Element {
    if (!element) {
        return document.documentElement;
    }

    if (element.getClientRects().length) {
        return element;
    }

    return findNearestBoxTarget(element.parentElement);
}

function isInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
    );
}

export interface LitElementWithDisplayBox extends LitElement {
    displayBox?: "contents" | "block";
}

export interface IntersectionObserverDecoratorInit extends IntersectionObserverInit {
    /**
     * Whether to ascend the DOM tree to find a parent with a layout box (i.e. non "display: contents") and use that as the target for intersection checking.
     */
    useAncestorBox?: boolean;
}

/**
 * A decorator that applies an IntersectionObserver to the element.
 * This is useful for lazy-loading elements that are not visible on the screen.
 *
 * @param init Configuration options for the IntersectionObserver
 *
 * ```ts
 * class MyElement extends LitElement {
 *     \@intersectionObserver()
 *     protected visible!: boolean;
 *
 *     \@intersectionObserver({ threshold: 0.5, rootMargin: '50px' })
 *     protected halfVisible!: boolean;
 *
 *     render() {
 *         if (!this.visible) return nothing;
 *
 *         return html`
 *             <div>
 *                 Content is visible!
 *                 ${this.halfVisible ? html`<p>More than 50% visible</p>` : ''}
 *             </div>
 *         `;
 *     }
 * }
 * ```
 *
 * @attr display-box If set to "contents", the element will be considered intersecting.
 */
export function intersectionObserver({
    useAncestorBox: initialUseAncestorBox = false,
    ...init
}: IntersectionObserverDecoratorInit = {}): IntersectionDecorator {
    return <T extends LitElementWithDisplayBox, K extends keyof T>(target: T, key: K) => {
        //#region Prepare observer

        let useAncestorBox = initialUseAncestorBox;

        property({ attribute: false, useDefault: false })(target, key);

        const boxTargets = new WeakMap<T, Element>();

        function findAndCacheBoxTarget(instance: T): Element {
            let boxTarget = boxTargets.get(instance);

            if (!boxTarget) {
                boxTarget = findNearestBoxTarget(instance);
                boxTargets.set(instance, boxTarget);
            }

            return boxTarget;
        }

        const observerCallback: IntersectionObserverCallback = (entries) => {
            for (const entry of entries) {
                const currentTarget = entry.target as T;
                let intersecting = entry.isIntersecting;

                if (!intersecting && useAncestorBox) {
                    const boxTarget = findAndCacheBoxTarget(currentTarget);
                    intersecting = isInViewport(boxTarget);
                    console.debug(
                        "IntersectionObserver fallback for",
                        currentTarget,
                        "using box target",
                        boxTarget,
                        "isIntersecting:",
                        intersecting,
                    );
                }

                const cachedIntersecting = currentTarget[key];

                if (cachedIntersecting !== intersecting) {
                    Object.assign(currentTarget, {
                        [key]: intersecting,
                    });

                    currentTarget.requestUpdate(key, cachedIntersecting);
                }
            }
        };

        //#endregion

        //#region Lifecycle

        const observer = new IntersectionObserver(observerCallback, {
            root: null,
            rootMargin: "0px",
            threshold: 0,
            ...init,
        });

        const { connectedCallback, disconnectedCallback } = target;

        target.connectedCallback = function connectedCallbackWrapper(this: T) {
            connectedCallback?.call(this);

            useAncestorBox = this.displayBox === "contents" || initialUseAncestorBox;

            if (this.hasUpdated) {
                observer.observe(this);
            } else {
                this.updateComplete.then(() => {
                    observer.observe(this);
                });
            }
        };

        target.disconnectedCallback = function disconnectedCallbackWrapper(
            this: LitElementWithDisplayBox,
        ) {
            disconnectedCallback?.call(this);

            if (observer) {
                observer.disconnect();
            }
        };
        //#endregion
    };
}
