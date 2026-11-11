import Foundation
import Vision
import CoreImage
import AppKit
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let out = URL(fileURLWithPath: CommandLine.arguments[2])
let ci = CIImage(contentsOf: url)!
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = .accurate
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
let h = VNImageRequestHandler(ciImage: ci, options: [:])
try! h.perform([req])
let mask = CIImage(cvPixelBuffer: req.results!.first!.pixelBuffer)
let sx = ci.extent.width / mask.extent.width, sy = ci.extent.height / mask.extent.height
let m = mask.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
let ctx = CIContext()
let cg = ctx.createCGImage(m, from: ci.extent)!
let rep = NSBitmapImageRep(cgImage: cg)
try! rep.representation(using: .png, properties: [:])!.write(to: out)
print("ok")
