export const canReuseImageSource = ({
  previousHash,
  sourceHash,
  canBootstrapFingerprints,
  isMarkedChanged,
  outputsExist,
}) => outputsExist && (
  previousHash === sourceHash
  || (canBootstrapFingerprints && !previousHash && !isMarkedChanged)
)

export const shouldRegenerateImageVariants = ({
  hasPreviousEntry,
  hashMatches,
  bootstrapMatches,
  isMarkedChanged,
}) => hasPreviousEntry && !hashMatches && (!bootstrapMatches || isMarkedChanged)
