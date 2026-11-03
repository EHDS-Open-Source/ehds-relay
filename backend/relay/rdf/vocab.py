"""Namespaces, authority-table URIs and the field -> property table for Health DCAT-AP.

Property names follow Health DCAT-AP release 8 (its published example dataset and SHACL
shapes). When the specification changes, update this table rather than the mapping code.
"""

from dataclasses import dataclass

from rdflib import Namespace, URIRef

from relay.domain.datasets import AccessRights

ADMS = Namespace("http://www.w3.org/ns/adms#")
CSVW = Namespace("http://www.w3.org/ns/csvw#")
CV = Namespace("http://data.europa.eu/m8g/")
DCAT = Namespace("http://www.w3.org/ns/dcat#")
DCATAP = Namespace("http://data.europa.eu/r5r/")
DCT = Namespace("http://purl.org/dc/terms/")
DPV = Namespace("https://w3id.org/dpv#")
ELI = Namespace("http://data.europa.eu/eli/ontology#")
DQV = Namespace("http://www.w3.org/ns/dqv#")
FOAF = Namespace("http://xmlns.com/foaf/0.1/")
GEODCATAP = Namespace("http://data.europa.eu/930/")
HEALTHDCATAP = Namespace("http://healthdataportal.eu/ns/health#")
PROV = Namespace("http://www.w3.org/ns/prov#")
RDFS = Namespace("http://www.w3.org/2000/01/rdf-schema#")
SKOS = Namespace("http://www.w3.org/2004/02/skos/core#")
VCARD = Namespace("http://www.w3.org/2006/vcard/ns#")
XSD = Namespace("http://www.w3.org/2001/XMLSchema#")

# Prefixes declared in every output, as the specification names them
PREFIXES: dict[str, Namespace] = {
    "adms": ADMS,
    "csvw": CSVW,
    "cv": CV,
    "dcat": DCAT,
    "dcatap": DCATAP,
    "dct": DCT,
    "dpv": DPV,
    "dqv": DQV,
    "eli": ELI,
    "foaf": FOAF,
    "geodcatap": GEODCATAP,
    "healthdcatap": HEALTHDCATAP,
    "prov": PROV,
    "rdfs": RDFS,
    "skos": SKOS,
    "vcard": VCARD,
    "xsd": XSD,
}

_ACCESS_RIGHT = "http://publications.europa.eu/resource/authority/access-right/"
ACCESS_RIGHTS_URI: dict[AccessRights, URIRef] = {
    AccessRights.PUBLIC: URIRef(_ACCESS_RIGHT + "PUBLIC"),
    AccessRights.RESTRICTED: URIRef(_ACCESS_RIGHT + "RESTRICTED"),
    AccessRights.NON_PUBLIC: URIRef(_ACCESS_RIGHT + "NON_PUBLIC"),
}


@dataclass(frozen=True)
class TermProperty:
    """A list of `Term`s on the dataset: the property, and the class its values belong to."""

    predicate: URIRef
    range: URIRef


# Dataset fields holding a list of Terms. Each term becomes `<dataset> predicate <uri>`,
# plus `<uri> a range` and a label (skos:prefLabel for concepts, rdfs:label otherwise).
DATASET_TERM_FIELDS: dict[str, TermProperty] = {
    "health_theme": TermProperty(HEALTHDCATAP.healthTheme, SKOS.Concept),
    "health_category": TermProperty(HEALTHDCATAP.healthCategory, SKOS.Concept),
    "coding_system": TermProperty(HEALTHDCATAP.hasCodingSystem, DCT.Standard),
    "conforms_to": TermProperty(DCT.conformsTo, DCT.Standard),
    "applicable_legislation": TermProperty(DCATAP.applicableLegislation, ELI.LegalResource),
    "geographical_coverage": TermProperty(DCT.spatial, DCT.Location),
    "type": TermProperty(DCT.type, SKOS.Concept),
    "language": TermProperty(DCT.language, DCT.LinguisticSystem),
    "generated_by": TermProperty(PROV.wasGeneratedBy, PROV.Activity),
}

# Plain literal lists on the dataset
DATASET_LITERAL_FIELDS: dict[str, URIRef] = {
    "keyword": DCAT.keyword,
    "identifier": DCT.identifier,
    "code_values": HEALTHDCATAP.hasCodeValues,
}

# Non-negative counts on the dataset
DATASET_COUNT_FIELDS: dict[str, URIRef] = {
    "number_of_records": HEALTHDCATAP.numberOfRecords,
    "number_of_unique_individuals": HEALTHDCATAP.numberOfUniqueIndividuals,
}

# Organisation fields and the property linking them to the dataset
DATASET_ORGANISATION_FIELDS: dict[str, URIRef] = {
    "health_data_access_body": HEALTHDCATAP.hdab,
    "health_data_holder": GEODCATAP.custodian,
    "publisher": DCT.publisher,
}

# Classes whose labels are written with skos:prefLabel rather than rdfs:label
CONCEPT_CLASSES = frozenset({SKOS.Concept})


# Every Health DCAT-AP dataset must carry the EU data theme "Health" as dcat:theme; the
# metadata form has no field for it, so the mapping always adds it.
HEALTH_DATA_THEME = URIRef("http://publications.europa.eu/resource/authority/data-theme/HEAL")

# The EHDS Regulation, (EU) 2025/327: the legislation every catalogue we export falls under
EHDS_REGULATION = URIRef("http://data.europa.eu/eli/reg/2025/327/oj")
