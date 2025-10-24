"use client";

import { useState, useEffect } from "react";
import { List, ListType, Ticker } from "@/lib/lists";

export default function Lists() {
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState("");
  const [newListType, setNewListType] = useState<ListType>("Watchlist");
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [newTicker, setNewTicker] = useState("");
  const [newsSummary, setNewsSummary] = useState<{
    symbol: string;
    summary: string;
    topHeadlines?: Array<{headline: string; date: string; url: string}>;
    articlesCount?: number;
  } | null>(null);
  const [loadingNews, setLoadingNews] = useState(false);

  const [redditBuzz, setRedditBuzz] = useState<{
    symbol: string;
    summary: string;
    mentionCount?: number;
    topPosts?: Array<{title: string; subreddit: string; score: number; url: string; upvoteRatio: number}>;
  } | null>(null);
  const [loadingReddit, setLoadingReddit] = useState(false);

  const [analysis, setAnalysis] = useState<{
    symbol: string;
    analysis: string;
    newsCount?: number;
    redditMentions?: number;
  } | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    const response = await fetch("/api/lists");
    const data = await response.json();
    setLists(data);
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const response = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName, type: newListType }),
    });

    if (response.ok) {
      setNewListName("");
      await fetchLists();
    }
  };

  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList || !newTicker.trim()) return;

    const response = await fetch(`/api/lists/${selectedList}/tickers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: newTicker }),
    });

    if (response.ok) {
      setNewTicker("");
      await fetchLists();
    }
  };

  const handleRemoveTicker = async (listId: string, tickerId: string) => {
    await fetch(`/api/lists/${listId}/tickers?tickerId=${tickerId}`, {
      method: "DELETE",
    });
    await fetchLists();
  };

  const handleGetNews = async (symbol: string) => {
    setLoadingNews(true);
    setNewsSummary(null);

    try {
      const response = await fetch(`/api/news?symbol=${symbol}`);
      const data = await response.json();

      if (response.ok) {
        setNewsSummary({
          symbol,
          summary: data.summary,
          topHeadlines: data.topHeadlines,
          articlesCount: data.articlesCount,
        });
      } else {
        alert(data.error || "Failed to fetch news");
      }
    } catch (error) {
      alert("Error fetching news summary");
    } finally {
      setLoadingNews(false);
    }
  };

  const handleGetReddit = async (symbol: string) => {
    setLoadingReddit(true);
    setRedditBuzz(null);

    try {
      const response = await fetch(`/api/reddit?symbol=${symbol}`);
      const data = await response.json();

      if (response.ok) {
        setRedditBuzz({
          symbol,
          summary: data.summary,
          mentionCount: data.mentionCount,
          topPosts: data.topPosts,
        });
      } else {
        alert(data.error || "Failed to fetch Reddit data");
      }
    } catch (error) {
      alert("Error fetching Reddit buzz");
    } finally {
      setLoadingReddit(false);
    }
  };

  const handleGetAnalysis = async (symbol: string) => {
    setLoadingAnalysis(true);
    setAnalysis(null);

    try {
      const response = await fetch(`/api/analysis?symbol=${symbol}`);
      const data = await response.json();

      if (response.ok) {
        setAnalysis({
          symbol,
          analysis: data.analysis,
          newsCount: data.newsCount,
          redditMentions: data.redditMentions,
        });
      } else {
        alert(data.error || "Failed to fetch analysis");
      }
    } catch (error) {
      alert("Error fetching analysis");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const currentList = lists.find((l) => l.id === selectedList);

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Lists</h1>

      {/* Create List Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New List</h2>
        <form onSubmit={handleCreateList} className="flex gap-4">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="List name"
            className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newListType}
            onChange={(e) => setNewListType(e.target.value as ListType)}
            className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Watchlist">Watchlist</option>
            <option value="Invested">Invested</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Create
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lists Sidebar */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Lists</h2>
          {lists.length === 0 ? (
            <p className="text-gray-500 text-sm">No lists yet. Create one above!</p>
          ) : (
            <div className="space-y-2">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setSelectedList(list.id)}
                  className={`w-full text-left px-4 py-3 rounded transition ${
                    selectedList === list.id
                      ? "bg-blue-100 border-l-4 border-blue-600"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="font-medium">{list.name}</div>
                  <div className="text-sm text-gray-600">
                    {list.type} • {list.tickers.length} ticker{list.tickers.length !== 1 ? "s" : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ticker Management */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          {!selectedList ? (
            <div className="text-center text-gray-500 py-12">
              <p>Select a list to manage tickers</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{currentList?.name}</h2>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                  {currentList?.type}
                </span>
              </div>

              {/* Add Ticker Form */}
              <form onSubmit={handleAddTicker} className="flex gap-4 mb-6">
                <input
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="Ticker symbol (e.g., AAPL)"
                  className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  Add Ticker
                </button>
              </form>

              {/* Tickers Table */}
              {currentList?.tickers.length === 0 ? (
                <p className="text-gray-500 text-sm">No tickers yet. Add one above!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Symbol</th>
                        <th className="text-left py-3 px-4 font-semibold">Added</th>
                        <th className="text-right py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentList?.tickers.map((ticker) => (
                        <tr key={ticker.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{ticker.symbol}</td>
                          <td className="py-3 px-4 text-gray-600 text-sm">
                            {new Date(ticker.addedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleGetNews(ticker.symbol)}
                              disabled={loadingNews}
                              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition mr-2 disabled:opacity-50"
                            >
                              {loadingNews && newsSummary?.symbol === ticker.symbol ? "Loading..." : "News"}
                            </button>
                            <button
                              onClick={() => handleGetReddit(ticker.symbol)}
                              disabled={loadingReddit}
                              className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded transition mr-2 disabled:opacity-50"
                            >
                              {loadingReddit && redditBuzz?.symbol === ticker.symbol ? "Loading..." : "Reddit"}
                            </button>
                            <button
                              onClick={() => handleGetAnalysis(ticker.symbol)}
                              disabled={loadingAnalysis}
                              className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded transition mr-2 disabled:opacity-50"
                            >
                              {loadingAnalysis && analysis?.symbol === ticker.symbol ? "Loading..." : "Analysis"}
                            </button>
                            <button
                              onClick={() => handleRemoveTicker(selectedList, ticker.id)}
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* News Summary Panel */}
              {newsSummary && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg text-blue-900">
                      News Summary: {newsSummary.symbol}
                      {newsSummary.articlesCount && (
                        <span className="text-sm font-normal text-blue-700 ml-2">
                          ({newsSummary.articlesCount} articles analyzed)
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => setNewsSummary(null)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-gray-700 whitespace-pre-wrap mb-4">
                    {newsSummary.summary}
                  </div>

                  {newsSummary.topHeadlines && newsSummary.topHeadlines.length > 0 && (
                    <div className="border-t border-blue-200 pt-3 mt-3">
                      <h4 className="font-semibold text-sm text-blue-900 mb-2">Top Headlines:</h4>
                      <div className="space-y-2">
                        {newsSummary.topHeadlines.map((headline, idx) => (
                          <div key={idx} className="text-sm">
                            <a
                              href={headline.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:text-blue-900 hover:underline font-medium"
                            >
                              {headline.headline}
                            </a>
                            <span className="text-gray-600 text-xs ml-2">
                              ({headline.date})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reddit Buzz Panel */}
              {redditBuzz && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg text-orange-900">
                      Reddit Buzz: {redditBuzz.symbol}
                      {redditBuzz.mentionCount !== undefined && (
                        <span className="text-sm font-normal text-orange-700 ml-2">
                          ({redditBuzz.mentionCount} mentions found)
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => setRedditBuzz(null)}
                      className="text-orange-600 hover:text-orange-800"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-gray-700 whitespace-pre-wrap mb-4">
                    {redditBuzz.summary}
                  </div>

                  {redditBuzz.topPosts && redditBuzz.topPosts.length > 0 && (
                    <div className="border-t border-orange-200 pt-3 mt-3">
                      <h4 className="font-semibold text-sm text-orange-900 mb-2">Top Posts:</h4>
                      <div className="space-y-3">
                        {redditBuzz.topPosts.map((post, idx) => (
                          <div key={idx} className="text-sm">
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-700 hover:text-orange-900 hover:underline font-medium"
                            >
                              {post.title}
                            </a>
                            <div className="text-gray-600 text-xs mt-1">
                              r/{post.subreddit} • {post.score} upvotes • {post.upvoteRatio}% upvote ratio
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Historical Analysis Panel */}
              {analysis && (
                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg text-purple-900">
                      Historical Analysis: {analysis.symbol}
                      <span className="text-sm font-normal text-purple-700 ml-2">
                        (News + Reddit Combined)
                      </span>
                    </h3>
                    <button
                      onClick={() => setAnalysis(null)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-gray-700 whitespace-pre-wrap">
                    {analysis.analysis}
                  </div>

                  {(analysis.newsCount !== undefined || analysis.redditMentions !== undefined) && (
                    <div className="border-t border-purple-200 pt-3 mt-3 text-xs text-gray-600">
                      Based on: {analysis.newsCount || 0} news articles • {analysis.redditMentions || 0} Reddit mentions
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
