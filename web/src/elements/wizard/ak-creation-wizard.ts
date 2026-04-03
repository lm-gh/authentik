import "#elements/LicenseNotice";
import "#admin/endpoints/connectors/agent/AgentConnectorForm";
import "#admin/endpoints/connectors/fleet/FleetConnectorForm";
import "#admin/endpoints/connectors/gdtc/GoogleChromeConnectorForm";
import "#elements/wizard/FormWizardPage";
import "#elements/wizard/TypeCreateWizardPage";
import "#elements/wizard/Wizard";

import { AKElement } from "#elements/Base";
import {
    DialogInit,
    modalInvoker,
    ModalInvokerDirectiveResult,
    ModalInvokerInit,
    renderModal,
} from "#elements/dialogs/utils";
import { LitPropertyRecord, SlottedTemplateResult } from "#elements/types";
import { ifPresent } from "#elements/utils/attributes";
import { StrictUnsafe } from "#elements/utils/unsafe";
import { TypeCreateWizardPageLayouts } from "#elements/wizard/TypeCreateWizardPage";
import { formatTypeCreateStepID } from "#elements/wizard/utils";
import { AKWizard } from "#elements/wizard/Wizard";

import { TypeCreate } from "@goauthentik/api";

import { msg, str } from "@lit/localize";
import { html, PropertyValues } from "lit";
import { guard } from "lit-html/directives/guard.js";
import { createRef, ref } from "lit-html/directives/ref.js";
import { property } from "lit/decorators.js";

export abstract class AKCreationWizard extends AKElement {
    //#region Modal helpers

    /**
     * A helper method to create an invoker for a modal containing this form.
     *
     * @see {@linkcode modalInvoker} for the underlying implementation.
     */
    public static asModalInvoker(init?: ModalInvokerInit): ModalInvokerDirectiveResult {
        return modalInvoker(this as unknown as CustomElementConstructor, init);
    }

    /**
     * Show a modal containing this form.
     *
     * @see {@linkcode renderModal} for the underlying implementation.
     * @returns A promise that resolves when the modal is closed.
     */
    public static showModal(init?: DialogInit): Promise<void> {
        return renderModal(new (this as unknown as CustomElementConstructor)(), init);
    }

    //#endregion

    protected override createRenderRoot(): HTMLElement | DocumentFragment {
        return this;
    }

    //#region Public Properties

    @property({ attribute: false })
    public creationTypes: TypeCreate[] | null = null;

    @property({ type: String, useDefault: true })
    public layout: TypeCreateWizardPageLayouts = TypeCreateWizardPageLayouts.list;

    @property({ attribute: false, useDefault: true })
    public finalHandler?: () => Promise<void>;

    /**
     * Optional singular label for the type of entity this wizard creates, used in messages and the like.
     */
    @property({ type: String, attribute: "entity-singular" })
    public entitySingular: string | null = null;

    /**
     * Optional plural label for the type of entity this wizard creates, used in messages and the like.
     */
    @property({ type: String, attribute: "entity-plural" })
    public entityPlural: string | null = null;

    /**
     * An optional description to show on the initial page of the wizard,
     * used to explain the different types or provide general information about the creation process.
     */
    @property({ type: String })
    public description: string | null = null;

    public get wizard(): AKWizard | null {
        return this.wizardRef.value || null;
    }

    //#endregion

    //#region Protected Properties

    protected wizardRef = createRef<AKWizard>();

    protected initialSteps = ["initial"];

    //#endregion

    //#region Lifecycle

    public override firstUpdated(changedProperties: PropertyValues<this>): void {
        super.firstUpdated(changedProperties);

        this.refresh();
    }

    public override connectedCallback(): void {
        super.connectedCallback();

        // Assigning a class to the host element to aid in selecting the wizard.
        this.classList.add("ak-c-wizard");
    }

    /**
     * Fetches data from the API endpoint.
     *
     * @param requestInit Optional request initialization parameters.
     * @returns A promise that resolves to the fetched data.
     */
    protected apiEndpoint?(requestInit?: RequestInit): Promise<TypeCreate[]>;

    /**
     * Refreshes the wizard's creation types.
     */
    public refresh = (): Promise<void> => {
        const result = this.apiEndpoint?.() ?? Promise.resolve([]);

        return result.then((types) => {
            this.creationTypes = types;
        });
    };

    /**
     * Listener invoked when a type is selected on the initial page,
     * responsible for updating the wizard's steps and validity.
     */
    protected typeSelectListener = (event: CustomEvent<TypeCreate>) => {
        const { wizard } = this;
        const stepID = formatTypeCreateStepID(event.detail);

        if (!wizard) return;

        const idx = wizard.steps.indexOf("initial") + 1;
        // Exclude all current steps starting with type-,
        // this happens when the user selects a type and then goes back
        const nextSteps = wizard.steps.filter((step) => !step.startsWith("type-"));

        nextSteps.splice(idx, 0, stepID);

        wizard.steps = nextSteps;
        wizard.isValid = true;
    };

    //#endregion

    //#region Rendering

    /**
     * Optional method to render additional content on the initial page, for example to explain the different types.
     */
    protected renderInitialPageContent(): SlottedTemplateResult {
        return this.description;
    }

    protected render(): SlottedTemplateResult {
        const initialPageContent = this.renderInitialPageContent?.() ?? null;

        return html`<ak-wizard
            ${ref(this.wizardRef)}
            entity-singular=${ifPresent(this.entitySingular)}
            entity-plural=${ifPresent(this.entityPlural)}
            description=${ifPresent(this.description)}
            part="main"
            .initialSteps=${this.initialSteps}
            .finalHandler=${this.finalHandler}
        >
            <ak-wizard-page-type-create
                slot="initial"
                part="page-form"
                .types=${this.creationTypes}
                layout=${this.layout}
                @ak-type-create-select=${this.typeSelectListener}
            >
                ${guard([initialPageContent], () => {
                    if (!initialPageContent) {
                        return null;
                    }
                    return html`<div slot="above-form">
                        <p>${initialPageContent}</p>
                    </div>`;
                })}
            </ak-wizard-page-type-create>
            ${this.renderForms()}
        </ak-wizard>`;
    }

    protected assembleFormProps?(type: TypeCreate): LitPropertyRecord<object>;

    /**
     * Renders the form pages for each creation type.
     *
     * Each form is slotted with a name corresponding to its type.
     *
     * @see {@linkcode formatTypeCreateStepID} for the expected slot naming convention.
     */
    protected renderForms(): SlottedTemplateResult {
        return guard([this.creationTypes], () => {
            if (!this.creationTypes) {
                return null;
            }

            return this.creationTypes.map((type) => {
                const props = this.assembleFormProps?.(type) ?? {};

                return html`<ak-wizard-page-form
                    part="page-form"
                    slot=${formatTypeCreateStepID(type)}
                    label=${msg(str`Create ${type.name}`)}
                    >${StrictUnsafe(type.component, props)}</ak-wizard-page-form
                >`;
            });
        });
    }

    //#endregion
}
