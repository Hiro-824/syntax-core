import { FeatureStructure, FeatureStructureInput } from "../../../features/features.js";
import { TypeSystem } from "../../../features/types.js";

export type AgrType = "agr-cat" | "non-3sing" | "1sing" | "2sing" | "3sing" | "plural";
export type AgrPerson = "1st" | "2nd" | "3rd";
export type AgrNumber = "sg" | "pl";
export type AgrGender = "fem" | "masc" | "neut";

export type AgrSpec = {
    agr?: AgrType;
    per?: AgrPerson;
    num?: AgrNumber;
    gend?: AgrGender;
};

type NormalizedAgrSpec = {
    type: AgrType;
    per?: AgrPerson;
    num?: AgrNumber;
    gend?: AgrGender;
};

function impliedAgrFeatures(type: AgrType): Pick<NormalizedAgrSpec, "per" | "num"> {
    switch (type) {
        case "3sing":
            return { per: "3rd", num: "sg" };
        case "1sing":
            return { per: "1st", num: "sg" };
        case "2sing":
            return { per: "2nd", num: "sg" };
        case "plural":
            return { num: "pl" };
        case "agr-cat":
        case "non-3sing":
            return {};
    }
}

function inferAgrType(spec: AgrSpec): AgrType {
    if (spec.num === "pl") return "plural";
    if (spec.num === "sg" && spec.per === "1st") return "1sing";
    if (spec.num === "sg" && spec.per === "2nd") return "2sing";
    if (spec.num === "sg" && spec.per === "3rd") return "3sing";
    return spec.agr ?? "agr-cat";
}

function assertCompatibleAgrFeature<T extends string>(
    featureName: string,
    explicitValue: T | undefined,
    impliedValue: T | undefined,
    type: AgrType,
    context: string
): void {
    if (explicitValue && impliedValue && explicitValue !== impliedValue) {
        throw new Error(`${context}: ${featureName}=${explicitValue} is incompatible with AGR=${type}.`);
    }
}

export function normalizeAgrSpec(spec: AgrSpec, context = "AGR"): NormalizedAgrSpec {
    const type = spec.agr && spec.agr !== "agr-cat" ? spec.agr : inferAgrType(spec);
    const implied = impliedAgrFeatures(type);

    assertCompatibleAgrFeature("PER", spec.per, implied.per, type, context);
    assertCompatibleAgrFeature("NUM", spec.num, implied.num, type, context);

    if (spec.gend && type !== "3sing") {
        throw new Error(`${context}: GEND is only appropriate for AGR=3sing.`);
    }

    if (type === "non-3sing" && spec.per === "3rd" && spec.num === "sg") {
        throw new Error(`${context}: PER=3rd and NUM=sg are incompatible with AGR=non-3sing.`);
    }

    return {
        type,
        per: spec.per ?? implied.per,
        num: spec.num ?? implied.num,
        gend: spec.gend,
    };
}

export function buildAgrInput(spec: AgrSpec, context = "AGR"): FeatureStructureInput {
    const normalized = normalizeAgrSpec(spec, context);
    const agr: FeatureStructureInput = { type: normalized.type };

    if (normalized.per) agr["PER"] = normalized.per;
    if (normalized.num) agr["NUM"] = normalized.num;
    if (normalized.gend) agr["GEND"] = normalized.gend;

    return agr;
}

export function setHeadAgr(
    head: FeatureStructure,
    spec: AgrSpec,
    types: TypeSystem,
    context = "AGR"
): void {
    head.add("AGR", FeatureStructure.fromJSON(buildAgrInput(spec, context), types), types);
}
