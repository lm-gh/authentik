import "#elements/wizard/ActionWizardPage";
import "#elements/LoadingOverlay";

import { EVENT_REFRESH } from "#common/constants";

import { AKElement } from "#elements/Base";
import { findClosestHostMatch } from "#elements/utils/render-roots";
import { WizardPage } from "#elements/wizard/WizardPage";

import { msg } from "@lit/localize";
import { customElement } from "@lit/reactive-element/decorators/custom-element.js";
import { property } from "@lit/reactive-element/decorators/property.js";
import { css, CSSResult, html, nothing, TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import PFButton from "@patternfly/patternfly/components/Button/button.css";
import PFTitle from "@patternfly/patternfly/components/Title/title.css";
import PFWizard from "@patternfly/patternfly/components/Wizard/wizard.css";

export interface WizardAction {
    displayName: string;
    subText?: string;
    run: () => Promise<boolean>;
}

export const ApplyActionsSlot = "apply-actions";

@customElement("ak-wizard")
export class Wizard extends AKElement {
    static styles: CSSResult[] = [
        PFButton,
        PFTitle,
        PFWizard,
        css`
            :host {
                display: block;
                height: min(var(--ak-c-dialog--AspectRatioHeight), var(--ak-c-dialog--MaxHeight));
            }

            .pf-c-wizard__main-body {
                height: stretch;
            }
        `,
    ];

    //#region Properties

    /**
     * Whether the wizard can be cancelled.
     */
    @property({ type: Boolean })
    public canCancel = true;

    /**
     * Whether the wizard can go back to the previous step.
     */
    @property({ type: Boolean })
    public canBack = true;

    /**
     * Header title of the wizard.
     */
    @property()
    public header?: string;

    /**
     * Description of the wizard.
     */
    @property()
    public description?: string;

    /**
     * Whether the wizard is valid and can proceed to the next step.
     */
    @property({ type: Boolean })
    isValid = false;

    /**
     * Actions to display at the end of the wizard.
     */
    @property({ attribute: false })
    public actions: WizardAction[] = [];

    @property({ attribute: false })
    public finalHandler?: () => Promise<void>;

    @property({ attribute: false })
    public state: { [key: string]: unknown } = {};

    //#endregion

    @state()
    protected loading = false;

    protected loadingOverlay = this.ownerDocument.createElement("ak-loading-overlay");

    //#region State

    /**
     * Memoized step tag names.
     */
    @state()
    protected _steps: string[] = [];

    /**
     * Step tag names present in the wizard.
     */
    get steps(): string[] {
        return this._steps;
    }

    set steps(nextSteps: string[]) {
        const addApplyActionsSlot = this._steps.includes(ApplyActionsSlot);

        this._steps = nextSteps;

        if (addApplyActionsSlot) {
            this.steps.push(ApplyActionsSlot);
        }

        this.requestUpdate();
    }

    /**
     * Initial steps to reset to.
     */
    #initialSteps: string[] = [];

    @state()
    protected activeStep: WizardPage | null = null;

    set activeStepElement(nextActiveStepElement: WizardPage | null) {
        this.activeStep = nextActiveStepElement;

        if (!this.activeStep) return;

        this.activeStep.activeCallback();
        this.activeStep.requestUpdate();
    }

    /**
     * The active step element being displayed.
     */
    get activeStepElement(): WizardPage | null {
        return this.activeStep;
    }

    getStepElementByIndex(stepIndex: number): WizardPage | null {
        const stepName = this._steps[stepIndex];

        return this.querySelector<WizardPage>(`[slot=${stepName}]`);
    }

    getStepElementByName(stepName: string): WizardPage | null {
        return this.querySelector<WizardPage>(`[slot=${stepName}]`);
    }

    #gatherSteps() {
        const firstPage = this.getStepElementByIndex(0);

        if (!this.activeStepElement && firstPage) {
            this.activeStepElement = firstPage;
        }

        const activeStepIndex = this.activeStepElement
            ? this.steps.indexOf(this.activeStepElement.slot)
            : 0;

        let lastPage = activeStepIndex === this.steps.length - 1;

        if (lastPage && !this.steps.includes("ak-wizard-page-action") && this.actions.length > 0) {
            this.steps = this.steps.concat("ak-wizard-page-action");
            lastPage = activeStepIndex === this.steps.length - 1;
        }

        return {
            firstPage,
            activeStepIndex,
            lastPage,
        };
    }

    //#endregion

    //#region Lifecycle

    public firstUpdated(): void {
        this.#initialSteps = this._steps;
    }

    public connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener(EVENT_REFRESH, this.#refreshListener);
    }

    public disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener(EVENT_REFRESH, this.#refreshListener);
    }

    //#endregion

    //#region Event Listeners

    /**
     * Reset the wizard to its initial state.
     */
    protected cleanup = (event?: Event) => {
        event?.preventDefault();
        event?.stopPropagation();

        const nearestDialog = findClosestHostMatch<HTMLDialogElement>(
            this,
            (element) => element instanceof HTMLDialogElement,
        );

        if (nearestDialog) {
            nearestDialog.requestClose();
            return;
        }

        for (const element of this.querySelectorAll("[data-wizardmanaged=true]")) {
            element.remove();
        }

        for (const step of this.steps) {
            const stepElement = this.getStepElementByName(step);

            stepElement?.reset?.();
        }

        this.steps = this.#initialSteps;
        this.actions = [];
        this.state = {};
        this.canBack = true;
        this.canCancel = true;
        this.activeStepElement = null;
    };

    #refreshListener = (event: Event) => {
        const { lastPage } = this.#gatherSteps();

        if (!lastPage) {
            event.stopImmediatePropagation();
        }
    };

    //#endregion

    //#region Rendering

    protected render(): TemplateResult {
        const { activeStepIndex, lastPage } = this.#gatherSteps();

        const navigatePrevious = () => {
            const prevPage = this.getStepElementByIndex(activeStepIndex - 1);

            if (prevPage) {
                this.activeStepElement = prevPage;
            }
        };

        const navigateNext = async (): Promise<void> => {
            if (!this.activeStepElement) return;

            if (this.activeStepElement.nextCallback) {
                this.loading = true;

                const completedStep = await this.activeStepElement.nextCallback();

                this.loading = false;

                if (!completedStep) return;

                if (lastPage) {
                    const promise = this.finalHandler?.() || Promise.resolve();

                    return promise
                        .then(() => this.cleanup())
                        .finally(() => {
                            this.loading = false;
                        });
                }
            }

            const nextPage = this.getStepElementByIndex(activeStepIndex + 1);

            if (nextPage) {
                this.activeStepElement = nextPage;
            }
        };

        return html`<div class="pf-c-wizard" role="presentation">
            <header class="pf-c-wizard__header">
                ${this.canCancel
                    ? html`<button
                          data-test-id="wizard-close"
                          class="pf-c-button pf-m-plain pf-c-wizard__close"
                          type="button"
                          aria-label="${msg("Close wizard")}"
                          @click=${this.cleanup}
                      >
                          <i class="fas fa-times" aria-hidden="true"></i>
                      </button>`
                    : nothing}
                <h1
                    id="modal-title"
                    role="heading"
                    aria-level="1"
                    class="pf-c-title pf-m-3xl pf-c-wizard__title"
                    data-test-id="wizard-heading"
                >
                    ${this.header}
                </h1>
                <p
                    role="heading"
                    aria-level="2"
                    id="modal-description"
                    class="pf-c-wizard__description"
                >
                    ${this.description}
                </p>
            </header>

            <div role="presentation" class="pf-c-wizard__outer-wrap">
                ${this.loading ? this.loadingOverlay : null}
                <div class="pf-c-wizard__inner-wrap">
                    <nav aria-label="${msg("Wizard steps")}" class="pf-c-wizard__nav">
                        <ol role="presentation" class="pf-c-wizard__nav-list">
                            ${this.steps.map((step, idx) => {
                                const stepEl = this.getStepElementByName(step);

                                if (!stepEl) return html`<p>Unexpected missing step: ${step}</p>`;

                                return html`
                                    <li role="presentation" class="pf-c-wizard__nav-item">
                                        <button
                                            class=${classMap({
                                                "pf-c-wizard__nav-link": true,
                                                "pf-m-current": idx === activeStepIndex,
                                            })}
                                            type="button"
                                            ?disabled=${activeStepIndex < idx}
                                            @click=${() => {
                                                this.activeStepElement = stepEl;
                                            }}
                                        >
                                            ${stepEl.label ?? msg("UNNAMED")}
                                        </button>
                                    </li>
                                `;
                            })}
                        </ol>
                    </nav>
                    <main aria-label="${msg("Wizard content")}" class="pf-c-wizard__main">
                        <div role="presentation" class="pf-c-wizard__main-body">
                            <slot name=${this.activeStepElement?.slot || this.steps[0]}></slot>
                        </div>
                    </main>
                </div>
                <nav class="pf-c-wizard__footer" aria-label="${msg("Wizard navigation")}">
                    ${this.canCancel
                        ? html`<div class="pf-c-wizard__footer-cancel">
                              <button
                                  data-test-id="wizard-navigation-cancel"
                                  class="pf-c-button pf-m-link"
                                  type="button"
                                  @click=${this.cleanup}
                              >
                                  ${msg("Cancel")}
                              </button>
                          </div>`
                        : nothing}
                    ${activeStepIndex > 0 && this.canBack
                        ? html`
                              <button
                                  data-test-id="wizard-navigation-previous"
                                  class="pf-c-button pf-m-secondary"
                                  type="button"
                                  @click=${navigatePrevious}
                              >
                                  ${msg("Back")}
                              </button>
                          `
                        : nothing}
                    <button
                        data-test-id="wizard-navigation-next"
                        class="pf-c-button pf-m-primary"
                        ?disabled=${!this.isValid}
                        type="button"
                        @click=${navigateNext}
                    >
                        ${lastPage && activeStepIndex > 0 ? msg("Finish") : msg("Next")}
                    </button>
                </nav>
            </div>
        </div>`;
    }

    //#endregion
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-wizard": Wizard;
    }

    interface WizardNavigationTestIDMap {
        next: HTMLButtonElement;
        previous: HTMLButtonElement;
        cancel: HTMLButtonElement;
    }

    interface WizardTestIDMap {
        navigation: WizardNavigationTestIDMap;
    }

    interface TestIDSelectorMap {
        wizard: WizardTestIDMap;
    }
}
