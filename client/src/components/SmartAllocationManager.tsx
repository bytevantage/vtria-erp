import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Package, 
  Calculator, 
  Settings, 
  BarChart3, 
  Clock, 
  Target,
  DollarSign,
  Truck,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface AllocationRequest {
  product_id: number;
  quantity_needed: number;
  business_context: 'estimation' | 'manufacturing' | 'sales';
  customer_tier?: 'vip' | 'standard' | 'new';
  project_priority?: 'high' | 'medium' | 'low';
  custom_strategy_id?: number;
}

interface AllocationPreview {
  total_cost: number;
  average_landed_cost: number;
  allocation_items: Array<{
    batch_id: number;
    quantity_allocated: number;
    landed_cost_per_unit: number;
    score: number;
    reason: string;
    warranty_remaining_days: number;
    age_days: number;
  }>;
  strategy_used: string;
  recommendations: string[];
}

interface AllocationStrategy {
  id: number;
  name: string;
  description: string;
  business_context: string;
  cost_weight: number;
  fifo_weight: number;
  warranty_weight: number;
  performance_weight: number;
  is_active: boolean;
}

const SmartAllocationManager: React.FC = () => {
  const [allocationRequest, setAllocationRequest] = useState<AllocationRequest>({
    product_id: 0,
    quantity_needed: 1,
    business_context: 'estimation'
  });
  const [preview, setPreview] = useState<AllocationPreview | null>(null);
  const [strategies, setStrategies] = useState<AllocationStrategy[]>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('allocate');

  useEffect(() => {
    fetchProducts();
    fetchStrategies();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/smart-allocation/allocation/strategies');
      const data = await response.json();
      setStrategies(data);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    }
  };

  const getPreview = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/smart-allocation/allocation/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationRequest)
      });
      const data = await response.json();
      setPreview(data);
    } catch (error) {
      console.error('Error getting preview:', error);
    }
    setLoading(false);
  };

  const executeAllocation = async () => {
    setExecuting(true);
    try {
      const response = await fetch('/api/smart-allocation/allocation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationRequest)
      });
      const data = await response.json();
      alert(`Allocation completed successfully! Transaction ID: ${data.transaction_id}`);
      setPreview(null);
    } catch (error) {
      console.error('Error executing allocation:', error);
      alert('Error executing allocation');
    }
    setExecuting(false);
  };

  const getContextIcon = (context: string) => {
    switch (context) {
      case 'estimation': return <Calculator className="w-4 h-4" />;
      case 'manufacturing': return <Package className="w-4 h-4" />;
      case 'sales': return <DollarSign className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getContextColor = (context: string) => {
    switch (context) {
      case 'estimation': return 'bg-blue-100 text-blue-800';
      case 'manufacturing': return 'bg-green-100 text-green-800';
      case 'sales': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Smart Allocation Manager</h1>
          <p className="text-gray-600">Optimize inventory allocation based on business context</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <TrendingUp className="w-4 h-4 mr-1" />
          AI-Powered
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="allocate">Smart Allocation</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="allocate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Allocation Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Product</label>
                  <Select
                    value={allocationRequest.product_id.toString()}
                    onValueChange={(value) => 
                      setAllocationRequest(prev => ({ ...prev, product_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Quantity Needed</label>
                  <Input
                    type="number"
                    value={allocationRequest.quantity_needed}
                    onChange={(e) => 
                      setAllocationRequest(prev => ({ 
                        ...prev, 
                        quantity_needed: parseInt(e.target.value) 
                      }))
                    }
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Business Context</label>
                  <Select
                    value={allocationRequest.business_context}
                    onValueChange={(value: 'estimation' | 'manufacturing' | 'sales') => 
                      setAllocationRequest(prev => ({ ...prev, business_context: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estimation">
                        <div className="flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          Estimation (Margin Protection)
                        </div>
                      </SelectItem>
                      <SelectItem value="manufacturing">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Manufacturing (Cost Optimization)
                        </div>
                      </SelectItem>
                      <SelectItem value="sales">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Sales (Balanced Approach)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Customer Tier (Optional)</label>
                  <Select
                    value={allocationRequest.customer_tier || ''}
                    onValueChange={(value: 'vip' | 'standard' | 'new' | '') => 
                      setAllocationRequest(prev => ({ 
                        ...prev, 
                        customer_tier: value || undefined 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No preference</SelectItem>
                      <SelectItem value="vip">VIP Customer</SelectItem>
                      <SelectItem value="standard">Standard Customer</SelectItem>
                      <SelectItem value="new">New Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={getPreview} disabled={loading || !allocationRequest.product_id}>
                  {loading ? 'Analyzing...' : 'Get Preview'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Allocation Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{preview.total_cost.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{preview.average_landed_cost.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Avg. Landed Cost</div>
                  </div>
                  <div className="text-center">
                    <Badge className={getContextColor(allocationRequest.business_context)}>
                      {getContextIcon(allocationRequest.business_context)}
                      <span className="ml-1">{preview.strategy_used}</span>
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Allocation Breakdown</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Warranty</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.allocation_items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>#{item.batch_id}</TableCell>
                          <TableCell>{item.quantity_allocated}</TableCell>
                          <TableCell>₹{item.landed_cost_per_unit.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={item.score} className="w-16" />
                              <span className="text-sm">{item.score.toFixed(1)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.warranty_remaining_days > 90 ? 'default' : 'destructive'}>
                              {item.warranty_remaining_days}d
                            </Badge>
                          </TableCell>
                          <TableCell>{item.age_days}d</TableCell>
                          <TableCell className="text-sm">{item.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {preview.recommendations.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Recommendations:</strong>
                      <ul className="mt-2 space-y-1">
                        {preview.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm">• {rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={executeAllocation} disabled={executing}>
                    {executing ? 'Executing...' : 'Execute Allocation'}
                  </Button>
                  <Button variant="outline" onClick={() => setPreview(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Allocation Strategies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy Name</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Cost Weight</TableHead>
                    <TableHead>FIFO Weight</TableHead>
                    <TableHead>Warranty Weight</TableHead>
                    <TableHead>Performance Weight</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strategies.map((strategy) => (
                    <TableRow key={strategy.id}>
                      <TableCell className="font-medium">{strategy.name}</TableCell>
                      <TableCell>
                        <Badge className={getContextColor(strategy.business_context)}>
                          {strategy.business_context}
                        </Badge>
                      </TableCell>
                      <TableCell>{strategy.cost_weight}%</TableCell>
                      <TableCell>{strategy.fifo_weight}%</TableCell>
                      <TableCell>{strategy.warranty_weight}%</TableCell>
                      <TableCell>{strategy.performance_weight}%</TableCell>
                      <TableCell>
                        <Badge variant={strategy.is_active ? 'default' : 'secondary'}>
                          {strategy.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Allocation Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Cost Optimization</span>
                    <Badge variant="default">94%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Inventory Turnover</span>
                    <Badge variant="default">87%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Warranty Utilization</span>
                    <Badge variant="default">91%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Allocations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">PLC Module - 5 units</span>
                    </div>
                    <Badge variant="outline">2 hrs ago</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">VFD Drive - 3 units</span>
                    </div>
                    <Badge variant="outline">4 hrs ago</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">HMI Panel - 1 unit</span>
                    </div>
                    <Badge variant="outline">6 hrs ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartAllocationManager;