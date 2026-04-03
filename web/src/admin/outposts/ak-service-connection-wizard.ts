import "#admin/outposts/ServiceConnectionDockerForm";
import "#admin/outposts/ServiceConnectionKubernetesForm";
import "#elements/wizard/FormWizardPage";
import "#elements/wizard/TypeCreateWizardPage";
import "#elements/wizard/Wizard";

import { DEFAULT_CONFIG } from "#common/api/config";

import { AKCreationWizard } from "#elements/wizard/ak-creation-wizard";

import { OutpostsApi, TypeCreate } from "@goauthentik/api";

import { msg } from "@lit/localize/init/install";
import { customElement } from "@lit/reactive-element/decorators/custom-element.js";

@customElement("ak-service-connection-wizard")
export class AKServiceConnectionWizard extends AKCreationWizard {
    public override entitySingular = msg("Outpost Integration");
    public override entityPlural = msg("Outpost Integrations");

    #api = new OutpostsApi(DEFAULT_CONFIG);

    protected apiEndpoint = (): Promise<TypeCreate[]> => {
        return this.#api.outpostsServiceConnectionsAllTypesList();
    };
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-service-connection-wizard": AKServiceConnectionWizard;
    }
}
