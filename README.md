 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/.dockerignore b/.dockerignore
new file mode 100644
index 0000000000000000000000000000000000000000..64a18b199cebf8177a2b7022c09186f7a0b53089
--- /dev/null
+++ b/.dockerignore
@@ -0,0 +1,4 @@
+.git
+node_modules
+npm-debug.log
+.DS_Store
 
EOF
)
