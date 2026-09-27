"""最短路径回溯。

根据算法产出的前驱表 pred，为每个可达节点还原
「源点 → … → 该节点」的完整节点序列。不可达节点不出现在结果里。
"""

from __future__ import annotations


def build_paths(
    pred: dict[str, str | None], source: str, nodes: list[str]
) -> dict[str, list[str]]:
    paths: dict[str, list[str]] = {source: [source]}
    for n in nodes:
        if n == source:
            continue
        path: list[str] = []
        cur: str | None = n
        while cur is not None:
            path.append(cur)
            cur = pred[cur]
        path.reverse()
        # 只有能一路回溯到源点的才是真实可达路径
        if len(path) > 1 and path[0] == source:
            paths[n] = path
    return paths
