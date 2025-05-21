import { useEffect, useState } from "react";

type FileNode = {
    path: string;
    name: string;
    type: "file" | "directory";
    children?: FileNode[];
};

function FileTreeNode({
    node,
    onSelect,
    openNodes,
    toggleOpen,
}: {
    node: FileNode;
    onSelect: (path: string) => void;
    openNodes: Record<string, boolean>;
    toggleOpen: (path: string) => void;
}) {
    return (
        <li>
            {node.type === "directory" ? (
                <>
                    <div onClick={() => toggleOpen(node.path)} style={{ cursor: "pointer" }}>
                        {openNodes[node.path] ? "📂" : "📁"} {node.name}
                    </div>
                    {openNodes[node.path] && node.children && (
                        <ul style={{ listStyle: "none", paddingLeft: "1em" }}>
                            {node.children.map((child) => (
                                <FileTreeNode
                                    key={child.path}
                                    node={child}
                                    onSelect={onSelect}
                                    openNodes={openNodes}
                                    toggleOpen={toggleOpen}
                                />
                            ))}
                        </ul>
                    )}
                </>
            ) : (
                <div
                    onClick={() => onSelect(node.path)}
                    style={{ cursor: "pointer", color: "blue" }}
                >
                    📄 {node.name}
                </div>
            )}
        </li>
    );
}

export default function FileEditor() {
    const [tree, setTree] = useState<FileNode[]>([]);
    const [selectedFile, setSelectedFile] = useState("");
    const [content, setContent] = useState("");
    const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetch("https://aftialoop.com/list_tree.php")
            .then((res) => res.json())
            .then(setTree);
    }, []);

    const toggleOpen = (path: string) => {
        setOpenNodes((prev) => ({ ...prev, [path]: !prev[path] }));
    };

    const loadFile = (path: string) => {
        console.log("📄 Loading file:", path);
        fetch(`https://aftialoop.com/read_file.php?file=${encodeURIComponent(path)}`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then((text) => {
                setSelectedFile(path);
                setContent(text);
            })
            .catch((err) => {
                console.error("❌ Failed to load file:", err);
                alert(`ファイル読み込み失敗: ${err.message}`);
            });
    };

    const saveFile = () => {
        fetch("https://aftialoop.com/save_file.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: selectedFile, content })
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then((msg) => alert(msg))
            .catch((err) => {
                console.error("❌ Failed to save file:", err);
                alert("保存に失敗しました: " + err.message);
            });
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>
            <div style={{ width: "300px", padding: "1em", borderRight: "1px solid #ccc", overflowY: "auto" }}>
                <h3>ファイル構造</h3>
                <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                    {tree.map((node) => (
                        <FileTreeNode
                            key={node.path}
                            node={node}
                            onSelect={loadFile}
                            openNodes={openNodes}
                            toggleOpen={toggleOpen}
                        />
                    ))}
                </ul>
            </div>
            <div style={{ flex: 1, padding: "1em" }}>
                <h3>{selectedFile || "ファイルを選択してください"}</h3>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{ width: "100%", height: "80%", fontFamily: "monospace" }}
                />
                <br />
                <button onClick={saveFile} disabled={!selectedFile}>
                    保存
                </button>
            </div>
        </div>
    );
}
