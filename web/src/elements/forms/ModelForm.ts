import "#elements/EmptyState";

import { APIError, parseAPIResponseError, pluckErrorDetail } from "#common/errors/network";
import { AKRefreshEvent } from "#common/events";

import { listen } from "#elements/decorators/listen";
import { asEditModalInvoker } from "#elements/dialogs/utils";
import { Form } from "#elements/forms/Form";
import { SlottedTemplateResult } from "#elements/types";

import { ConsoleLogger } from "#logger/browser";

import { msg } from "@lit/localize";
import { PropertyValues } from "lit";
import { html } from "lit-html";
import { property, state } from "lit/decorators.js";

/**
 * A base form that automatically tracks the server-side object (instance)
 * that we're interested in. Handles loading and tracking of the instance.
 *
 * @template T The type of the model instance.
 * @template PKT The type of the primary key of the model instance.
 * @template D The result of `toJSON()`, which is the data sent to the server on submit.
 *
 * @prop {T} instance - The current instance being edited or viewed.
 * @prop {PKT} instancePk - The primary key of the instance to load.
 */
export abstract class ModelForm<
    T extends object = object,
    PKT extends string | number = string | number,
    D = T,
> extends Form<T, D> {
    /**
     * A helper method to create an invoker for editing an instance of this form.
     *
     * The invoker will look for a `data-pk` attribute on the clicked element to determine which instance to load.
     *
     * @see {@linkcode Form.asModalInvoker} for opening a blank form in a modal.
     * @see {@linkcode asInvoker} for the underlying implementation.
     */
    public static asEditModalInvoker = asEditModalInvoker;

    protected logger = ConsoleLogger.prefix(`model-form/${this.tagName.toLowerCase()}`);

    @state()
    protected error: APIError | null = null;

    protected abortController: AbortController | null = null;

    /**
     * An overridable method for loading an instance.
     *
     * @param pk The primary key of the instance to load.
     * @returns A promise that resolves to the loaded instance.
     */
    protected abstract loadInstance(pk: PKT): Promise<T>;

    /**
     * An overridable method for loading any data, beyond the instance.
     *
     *
     * @see {@linkcode loadInstance}
     * @returns A promise that resolves when the data has been loaded.
     */
    protected async load?(): Promise<void | boolean>;

    /**
     * Timestamp of last call to {@linkcode load}.
     * Used to prevent multiple calls to `load` when the form is rapidly shown and hidden.
     */
    #loadedAt: Date | null = null;

    @property({
        attribute: "pk",
        useDefault: true,
        converter: { fromAttribute: (value) => value as PKT },
    })
    public instancePk: PKT | null = null;

    @property({ attribute: false, useDefault: true })
    public instance: T | null = this.createDefaultInstance();

    //#region Public methods

    public override reset(): void {
        super.reset();

        this.instance = null;
        this.instancePk = null;
        this.error = null;
    }

    public createDefaultInstance(): T | null {
        return null;
    }

    //#endregion

    protected override formatSubmitLabel(): string {
        if (this.instancePk) {
            return msg("Save Changes", {
                id: "model-form.apply-submit",
            });
        }

        return super.formatSubmitLabel();
    }

    protected override formatHeadline(): string {
        return super.formatHeadline(this.headline, this.instancePk ? msg("Edit") : null);
    }

    //#region Lifecycle

    protected doLoad() {
        if (this.#loadedAt || this.loading) {
            return Promise.resolve();
        }

        if (this.load) {
            this.loading = true;
        }

        const loadPromise = this.load?.() || Promise.resolve(true);

        return loadPromise
            .then((result) => {
                this.#loadedAt = new Date();

                if (result === false) {
                    this.logger.debug("Load method returned false, skipping instance load");
                    return;
                }

                return this.refresh();
            })
            .catch(this.delegateError)
            .finally(() => {
                this.loading = false;
            });
    }

    @listen(AKRefreshEvent)
    public refresh = async (): Promise<void> => {
        if (!this.instancePk) {
            this.logger.info("Skipping refresh. No instance PK provided.");
            return;
        }

        this.loading = true;

        return this.loadInstance(this.instancePk)
            .then((instance) => {
                this.instance = instance;
            })
            .catch(this.delegateError)
            .finally(() => {
                this.loading = false;
            });
    };

    protected delegateError = async (error: unknown): Promise<void> => {
        this.error = await parseAPIResponseError(error);
    };

    public override updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);

        const hasPK = !!(changedProperties.has("instancePk") && this.instancePk);

        if (hasPK) {
            this.logger.debug("Instance PK changed, refreshing form", {
                instancePk: this.instancePk,
            });
        }
    }

    protected override render(): SlottedTemplateResult {
        if (!this.visible) {
            return null;
        }

        if (this.loading) {
            return html`<ak-empty-state loading></ak-empty-state>`;
        }

        if (this.error) {
            return html`<ak-empty-state icon="pf-icon-warning-triangle" part="error-state">
                <span>${msg("An error occurred while loading the form.")}</span>
                <div slot="body">${pluckErrorDetail(this.error)}</div>
            </ak-empty-state>`;
        }

        if (!this.#loadedAt) {
            this.doLoad();
        }

        return super.render();
    }

    //#endregion
}
