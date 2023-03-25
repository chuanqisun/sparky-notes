//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//    Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>
//-----------------------------------------------------------------------

type Vector =
    | readonly number[]
    | Float32Array;

// Returns a number from -1 to 1
// Higher means more similar
// -1 means the vectors are opposite
// 0 means the vectors are unrelated
// 1 means the vectors are identical
// It calculates dot(a, b) / (magnitude(a) * magnitude(b))
export const cosineSimilarity = (a: Vector, b: Vector): number => {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magnitudeA += a[i] * a[i];
        magnitudeB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
};
