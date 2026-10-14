package ai.calyx.app

import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebView
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Shapes
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import com.getcapacitor.BridgeActivity
import kotlinx.coroutines.launch

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        val calyxWebView = bridge.webView
        (calyxWebView.parent as? ViewGroup)?.removeView(calyxWebView)
        setContent { CalyxExpressiveApp(calyxWebView) }
    }
}

private fun WebView.runCalyxAction(script: String) {
    evaluateJavascript(script, null)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CalyxExpressiveApp(webView: WebView) {
    val context = LocalContext.current
    val dark = isSystemInDarkTheme()
    val colors = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && dark -> dynamicDarkColorScheme(context)
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> dynamicLightColorScheme(context)
        dark -> darkColorScheme(primary = Color(0xFFFFB4A5), secondary = Color(0xFFD7BDB6))
        else -> lightColorScheme(primary = Color(0xFF904A3B), secondary = Color(0xFF77574F))
    }
    val expressiveShapes = Shapes(
        extraSmall = RoundedCornerShape(12.dp),
        small = RoundedCornerShape(16.dp),
        medium = RoundedCornerShape(24.dp),
        large = RoundedCornerShape(32.dp),
        extraLarge = RoundedCornerShape(40.dp),
    )
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    MaterialExpressiveTheme(colorScheme = colors, shapes = expressiveShapes) {
        ModalNavigationDrawer(
            drawerState = drawerState,
            drawerContent = {
                ModalDrawerSheet(drawerShape = RoundedCornerShape(topEnd = 32.dp, bottomEnd = 32.dp)) {
                    Text("Calyx", style = MaterialTheme.typography.headlineLarge, modifier = Modifier.padding(28.dp))
                    NavigationDrawerItem(
                        label = { Text("Conversations") },
                        selected = true,
                        onClick = {
                            webView.runCalyxAction("document.querySelector('.mobile-menu-button')?.click()")
                            scope.launch { drawerState.close() }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                    NavigationDrawerItem(
                        label = { Text("New conversation") },
                        selected = false,
                        onClick = {
                            webView.runCalyxAction("document.querySelector('[aria-label=\\\"New conversation\\\"]')?.click()")
                            scope.launch { drawerState.close() }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                    NavigationDrawerItem(
                        label = { Text("Account & personalization") },
                        selected = false,
                        onClick = {
                            webView.runCalyxAction("document.querySelector('.user-chip,.sign-in')?.click()")
                            scope.launch { drawerState.close() }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                    NavigationDrawerItem(
                        label = { Text("Toggle appearance") },
                        selected = false,
                        onClick = {
                            webView.runCalyxAction("document.querySelector('.theme-toggle')?.click()")
                            scope.launch { drawerState.close() }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                }
            },
        ) {
            Scaffold(
                topBar = {
                    CenterAlignedTopAppBar(
                        title = { Text("Calyx") },
                        navigationIcon = {
                            IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                Text("☰")
                            }
                        },
                        actions = {
                            IconButton(onClick = { webView.runCalyxAction("document.querySelector('.user-chip,.sign-in')?.click()") }) {
                                Text("●")
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainer,
                        ),
                    )
                },
                containerColor = MaterialTheme.colorScheme.surface,
            ) { padding ->
                AndroidView(
                    factory = { webView },
                    modifier = Modifier.fillMaxSize().padding(padding),
                )
            }
        }
    }
}
