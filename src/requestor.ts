import fs from "fs";
import elliptic from "elliptic";
import canonicalize from "canonicalize";

export function createGolemNodeDescriptor(
  privKeyPath: string,
  certPath: string,
  nodeId: string,
) {
  /** The requestor certificate signed by an authority */
  const signedCert = JSON.parse(fs.readFileSync(certPath).toString());
  const privKey = JSON.parse(fs.readFileSync(privKeyPath).toString());

  const ec = new elliptic.eddsa("ed25519");
  const keyPair = ec.keyFromSecret(privKey.key);

  /**
   * Describe the requestor node
   */
  const nodeDescriptor = {
    nodeId: nodeId,
    // We will re-use the periods from the certificate
    validityPeriod: signedCert.certificate.validityPeriod,
    permissions: signedCert.certificate.permissions,
  };

  const canonicDescriptor = canonicalize(nodeDescriptor);
  if (!canonicDescriptor) {
    throw new Error("Failed to canonicalize the node description");
  }
  const encoder = new TextEncoder();
  const encCanDescr = encoder.encode(canonicDescriptor);

  const nodeDescriptorSignature = keyPair
    .sign(Buffer.from(encCanDescr))
    .toHex();

  /**
   * Wrap it all into a certificate
   */
  const nodeCert = {
    $schema: "https://schemas.golem.network/v1/node-descriptor.schema.json",
    nodeDescriptor: nodeDescriptor,
    signature: {
      algorithm: {
        hash: "sha512",
        encryption: "EdDSA",
      },
      value: nodeDescriptorSignature,
      signer: signedCert,
    },
  };

  // Validate before returning to the user

  return nodeCert;
}
