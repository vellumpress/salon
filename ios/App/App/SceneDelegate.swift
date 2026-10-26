import UIKit
import Capacitor

/// Full-bleed bridge. Light status glyphs sit on the strip the CSS paints.
final class TbrBridgeViewController: CAPBridgeViewController {
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 243 / 255, green: 241 / 255, blue: 235 / 255, alpha: 1)
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // Paper, the same ground as the pages, so the shell never flashes white.
        window?.backgroundColor = UIColor(red: 243 / 255, green: 241 / 255, blue: 235 / 255, alpha: 1)
        window?.rootViewController = TbrBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
