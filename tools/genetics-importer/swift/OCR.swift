import AppKit
import Foundation
import Vision

struct Bounds: Codable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct Observation: Codable {
    let text: String
    let confidence: Float
    let bounds: Bounds
}

struct ImageResult: Codable {
    let path: String
    let observations: [Observation]
    let error: String?
}

func recognize(path: String) -> ImageResult {
    guard let image = NSImage(contentsOfFile: path) else {
        return ImageResult(path: path, observations: [], error: "unable to open image")
    }
    var rect = NSRect(origin: .zero, size: image.size)
    guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
        return ImageResult(path: path, observations: [], error: "unable to create CGImage")
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hant", "en-US"]
    request.usesLanguageCorrection = true

    do {
        try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
        let observations = (request.results ?? []).compactMap { observation -> Observation? in
            guard let candidate = observation.topCandidates(1).first else { return nil }
            let box = observation.boundingBox
            return Observation(
                text: candidate.string,
                confidence: candidate.confidence,
                bounds: Bounds(
                    x: box.minX,
                    y: 1.0 - box.maxY,
                    width: box.width,
                    height: box.height
                )
            )
        }
        return ImageResult(path: path, observations: observations, error: nil)
    } catch {
        return ImageResult(path: path, observations: [], error: error.localizedDescription)
    }
}

let paths = Array(CommandLine.arguments.dropFirst())
let results = paths.map(recognize)
let encoder = JSONEncoder()
encoder.outputFormatting = [.withoutEscapingSlashes]
let data = try encoder.encode(results)
FileHandle.standardOutput.write(data)
