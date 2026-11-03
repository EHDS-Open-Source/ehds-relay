"""Serialise a metadata graph. Every format is written from the same graph.

Each function returns ``str``. The RDF/XML text declares ``encoding="utf-8"``, so callers
sending it over HTTP must encode it as UTF-8. Blank-node ids in JSON-LD and RDF/XML are
random, so compare graphs, not strings.
"""

from rdflib import Graph

from relay.rdf.vocab import PREFIXES

TURTLE_MEDIA_TYPE = "text/turtle"
JSONLD_MEDIA_TYPE = "application/ld+json"
RDFXML_MEDIA_TYPE = "application/rdf+xml"

# Inline context built from the one prefix table: output does not depend on which
# namespaces a graph happens to bind, and readers need no network fetch.
_JSONLD_CONTEXT = {prefix: str(namespace) for prefix, namespace in PREFIXES.items()}


def to_turtle(graph: Graph) -> str:
    return graph.serialize(format="turtle")


def to_jsonld(graph: Graph) -> str:
    return graph.serialize(format="json-ld", context=_JSONLD_CONTEXT, indent=2)


def to_rdfxml(graph: Graph) -> str:
    return graph.serialize(format="pretty-xml")
