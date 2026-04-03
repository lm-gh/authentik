import { SlottedTemplateResult } from "#elements/types";

import { LitElement } from "lit";

/**
 * A symbol used to identify elements that are designed to be transcluded
 * into dialogs or other containers that support transclusion.
 */
export const TransclusionSymbol = Symbol("transclusion");

/**
 * An element that is designed to included in a dialog or other container that supports transclusion.
 */
export interface TransclusionElement extends LitElement {
    /**
     * A marker property to identify this element as a TransclusionElement.
     *
     * This is useful to avoid a strict type or interface check,
     * which can be problematic when dealing with elements across different shadow roots.
     */
    [TransclusionSymbol]: boolean;

    /**
     * The display box to use for the element when rendered in a dialog or other container.
     */
    displayBox?: "contents" | "block";

    /**
     * Whether the element is considered visible for the purposes of rendering in a dialog or other container.
     */
    visible?: boolean;

    /**
     * An optional method to render a header for the element, which can be used
     * when the element is transcluded into a dialog or other container that supports headers.
     *
     * @param force Whether to force the contents to render.
     */
    renderHeader?(force?: boolean): SlottedTemplateResult;

    /**
     * An optional method to render action buttons for the element, which can be used
     * when the element is transcluded into a dialog or other container that supports action buttons.
     *
     * @param force Whether to force the contents to render.
     */
    renderActions?(force?: boolean): SlottedTemplateResult;

    /**
     * The label to use for the cancel button when this element is transcluded
     * into a dialog or other container.
     */
    cancelButtonLabel?: string | null;

    /**
     * Whether the dialog or other container should render a default cancel button
     * when this element is transcluded.
     */
    cancelable?: boolean;
}

/**
 * Type predicate to determine if an element is a {@linkcode TransclusionElement}.
 *
 * @param element The element to check.
 */
export function isTransclusionElement(element: Element): element is TransclusionElement {
    return TransclusionSymbol in element;
}
