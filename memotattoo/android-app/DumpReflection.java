import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.io.File;

public class DumpReflection {
    public static void main(String[] args) throws Exception {
        File f = new File("/Users/ramosmiguel/.gradle/caches/transforms-4/e76ab65db720ebd2a2e36787cf8fcb15/transformed/jetified-firebase-ai-17.8.0-api.jar"); // I need the actual classes.jar
        if (!f.exists()) {
            System.out.println("Jar not found");
            return;
        }
        URLClassLoader loader = new URLClassLoader(new URL[]{f.toURI().toURL()});
        Class<?> clazz = loader.loadClass("com.google.firebase.ai.type.ImagePart");
        for (Method m : clazz.getDeclaredMethods()) {
            System.out.println(m.getName() + " -> " + m.getReturnType().getName());
        }
    }
}
