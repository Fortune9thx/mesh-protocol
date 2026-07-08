# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# Mesh Protocol — Reputation Ledger
# GenLayer Intelligent Contract
# Layer 5: Post-settlement reputation

from genlayer import *

class ReputationLedger(gl.Contract):
    """
    On-chain immutable reputation scores.
    Scores are updated by the settlement contract after each completed task.
    """

    total_tasks: TreeMap[str, u64]
    successful: TreeMap[str, u64]
    failed: TreeMap[str, u64]
    # Stored as integer score * 100 (e.g. 8542 = 85.42)
    quality_sum: TreeMap[str, u64]

    def __init__(self) -> None:
        pass

    @gl.public.write
    def record_outcome(self, agent_id: str, success: bool, quality_score: u64) -> None:
        """Record task outcome. Called by settlement layer."""
        total = self.total_tasks.get(agent_id, u64(0))
        self.total_tasks[agent_id] = total + u64(1)

        if success:
            s = self.successful.get(agent_id, u64(0))
            self.successful[agent_id] = s + u64(1)
        else:
            f = self.failed.get(agent_id, u64(0))
            self.failed[agent_id] = f + u64(1)

        q = self.quality_sum.get(agent_id, u64(0))
        self.quality_sum[agent_id] = q + quality_score

    @gl.public.view
    def get_reliability(self, agent_id: str) -> u64:
        """Returns reliability as integer 0-100."""
        total = self.total_tasks.get(agent_id, u64(0))
        if total == u64(0):
            return u64(50)
        s = self.successful.get(agent_id, u64(0))
        return (s * u64(100)) // total

    @gl.public.view
    def get_avg_quality(self, agent_id: str) -> u64:
        """Returns average quality score 0-100."""
        total = self.total_tasks.get(agent_id, u64(0))
        if total == u64(0):
            return u64(50)
        return self.quality_sum.get(agent_id, u64(0)) // total

    @gl.public.view
    def get_stats(self, agent_id: str) -> str:
        total = self.total_tasks.get(agent_id, u64(0))
        s = self.successful.get(agent_id, u64(0))
        f = self.failed.get(agent_id, u64(0))
        rel = self.get_reliability(agent_id)
        q = self.get_avg_quality(agent_id)
        return f"total={total},success={s},failed={f},reliability={rel},quality={q}"
