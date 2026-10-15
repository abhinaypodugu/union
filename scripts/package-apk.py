#!/usr/bin/env python3
import os, zipfile, glob, json, subprocess, io
from PIL import Image

def main():
    root = os.path.abspath(os.path.dirname(__file__) + "/..")
    android_root = r"C:\Users\abhin\AppData\Local\Android"
    zipalign_exe = os.path.join(android_root, "build-tools", "zipalign.exe")
    apksigner_jar = os.path.join(android_root, "build-tools", "lib", "apksigner.jar")
    java_exe = os.path.join(android_root, "jre", "jdk-17.0.20.1+1-jre", "bin", "java.exe")
    keystore_path = os.path.join(android_root, "union-release.jks")

    os.chdir(root)
    hbcs = sorted(glob.glob("dist/_expo/static/js/android/*.hbc"), key=os.path.getmtime)
    if not hbcs:
        print("Error: No bundle found in dist/_expo/static/js/android/. Run 'npx expo export --platform android' first.")
        return 1
    hbc = hbcs[-1]
    print(f"Using bundle: {hbc} ({os.path.getsize(hbc)} bytes)")

    icon_map = {
        'res/d2.webp': 'android/app/src/main/res/mipmap-mdpi/ic_launcher.webp',
        'res/MO.webp': 'android/app/src/main/res/mipmap-hdpi/ic_launcher.webp',
        'res/qs.webp': 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp',
        'res/Sn.webp': 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp',
        'res/sK.webp': 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp',
        'res/yw.webp': 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp',
        'res/fq.webp': 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp',
        'res/u5.webp': 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp',
        'res/j_.webp': 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp',
        'res/-6.webp': 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp',
    }

    # Convert foreground to png bytes
    fg_im = Image.open('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp')
    buf = io.BytesIO()
    fg_im.save(buf, format='PNG')
    fg_png_bytes = buf.getvalue()

    unaligned = "union-unaligned.apk"
    aligned = "union-aligned.apk"
    final = "union.apk"
    for p in [unaligned, aligned, final]:
        if os.path.exists(p): os.remove(p)

    with zipfile.ZipFile("commons.apk", "r") as zin, zipfile.ZipFile(unaligned, "w") as zout:
        for info in zin.infolist():
            fname = info.filename
            if fname.startswith("META-INF/") and (fname.endswith(".SF") or fname.endswith(".RSA") or fname.endswith(".DSA") or fname == "META-INF/MANIFEST.MF"):
                continue
            data = zin.read(fname)
            if fname == "assets/index.android.bundle":
                with open(hbc, "rb") as f: data = f.read()
            elif fname == "assets/app.config":
                cfg = json.loads(data.decode("utf-8"))
                cfg["name"] = "Union"; cfg["scheme"] = "union"
                data = json.dumps(cfg, separators=(",", ":")).encode("utf-8")
            elif fname == "resources.arsc":
                data = data.replace(b"\x07\x07Commons\x00", b"\x05\x05Union\x00\x00\x00")
                u16_old = b"\x07\x00" + "Commons".encode("utf-16le") + b"\x00\x00"
                u16_new = b"\x05\x00" + "Union".encode("utf-16le") + b"\x00\x00\x00\x00\x00\x00"
                data = data.replace(u16_old, u16_new)
            elif fname in icon_map:
                with open(icon_map[fname], "rb") as f: data = f.read()
            elif fname == "res/Zt.png":
                data = fg_png_bytes

            ni = zipfile.ZipInfo(filename=fname, date_time=info.date_time)
            ni.compress_type = info.compress_type; ni.external_attr = info.external_attr
            zout.writestr(ni, data)

    print("Aligning APK...")
    subprocess.run([zipalign_exe, "-p", "-f", "4", unaligned, aligned], check=True)
    print("Signing APK...")
    subprocess.run([java_exe, "-jar", apksigner_jar, "sign", "--ks", keystore_path, "--ks-key-alias", "unionkey", "--ks-pass", "pass:union123", "--key-pass", "pass:union123", "--out", final, aligned], check=True)
    for p in [unaligned, aligned]:
        if os.path.exists(p): os.remove(p)
    print(f"Success! {final} generated ({os.path.getsize(final)} bytes) with real Union app icons.")
    return 0

if __name__ == "__main__":
    main()
