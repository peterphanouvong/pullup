import ExpoModulesCore
import Vision
import CoreImage
import UIKit

/// Lifts the subject (the person) out of a photo with Vision's foreground
/// instance mask, iOS 17+. On device, no network. Returns a PNG with
/// transparency, cropped to the subject, in the caches directory; the JS
/// side turns it into a sticker.
public class SubjectLiftModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SubjectLift")

    AsyncFunction("liftSubject") { (uri: String) throws -> String in
      guard #available(iOS 17.0, *) else {
        throw UnsupportedException()
      }
      guard let url = URL(string: uri),
            let data = try? Data(contentsOf: url),
            let photo = UIImage(data: data) else {
        throw LoadException()
      }

      // Redraw upright and no bigger than needed: camera photos carry an
      // EXIF orientation Vision would otherwise have to be told about,
      // and a 12MP selfie is far more than a sticker wants.
      let upright = normalize(photo, maxSide: 1200)
      guard let cgImage = upright.cgImage else { throw LoadException() }

      let request = VNGenerateForegroundInstanceMaskRequest()
      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
      try handler.perform([request])
      guard let result = request.results?.first, !result.allInstances.isEmpty else {
        throw NoSubjectException()
      }

      let buffer = try result.generateMaskedImage(
        ofInstances: result.allInstances,
        from: handler,
        croppedToInstancesExtent: true
      )
      let ciImage = CIImage(cvPixelBuffer: buffer)
      let context = CIContext()
      guard let lifted = context.createCGImage(ciImage, from: ciImage.extent),
            let png = UIImage(cgImage: lifted).pngData() else {
        throw LoadException()
      }

      let destination = FileManager.default.temporaryDirectory
        .appendingPathComponent("subject-\(UUID().uuidString).png")
      try png.write(to: destination)
      return destination.absoluteString
    }
  }
}

/// The photo drawn into a fresh, `.up`-oriented bitmap, scaled so its
/// longer side is at most `maxSide` points.
private func normalize(_ image: UIImage, maxSide: CGFloat) -> UIImage {
  let longest = max(image.size.width, image.size.height)
  let scale = min(1, maxSide / max(longest, 1))
  let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
  let format = UIGraphicsImageRendererFormat.default()
  format.scale = 1
  format.opaque = false
  return UIGraphicsImageRenderer(size: size, format: format).image { _ in
    image.draw(in: CGRect(origin: .zero, size: size))
  }
}

internal final class UnsupportedException: Exception, @unchecked Sendable {
  override var reason: String { "Subject lifting needs iOS 17 or later" }
}

internal final class LoadException: Exception, @unchecked Sendable {
  override var reason: String { "Couldn't read the photo" }
}

internal final class NoSubjectException: Exception, @unchecked Sendable {
  override var reason: String { "No one found in the photo" }
}
